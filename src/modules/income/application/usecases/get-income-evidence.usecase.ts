import { BadRequestException, ConflictException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { InjectEntityManager } from "@nestjs/typeorm";
import { EntityManager } from "typeorm";
import { SalePaymentEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-payment.entity";
import { ListSaleOrderAttachmentsUsecase } from "src/modules/sale-order-attachments/application/usecases/list-sale-order-attachments.usecase";
import { UploadSaleOrderAttachmentUsecase } from "src/modules/sale-order-attachments/application/usecases/upload-sale-order-attachment.usecase";
import { SaleOrderAttachmentType } from "src/modules/sale-order-attachments/domain/value-objects/sale-order-attachment-type";
import { IncomeEvidenceSummary } from "../dtos/income.output";
import { SaleOrdersRealtimeService } from "src/modules/sale-orders/infrastructure/realtime/sale-orders-realtime.service";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";

@Injectable()
export class GetIncomeEvidenceUsecase {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly listAttachments: ListSaleOrderAttachmentsUsecase,
  ) {}

  async execute(incomeId: string): Promise<IncomeEvidenceSummary & { incomeId: string; saleOrderId: string; saleOrderPaymentId: string }> {
    const payment = await this.entityManager.getRepository(SalePaymentEntity).findOne({ where: { id: incomeId } });
    if (!payment) throw new NotFoundException("Ingreso no encontrado");
    const attachments = await this.listAttachments.execute({ saleOrderPaymentId: incomeId });
    let attachment = attachments.find((item) => item.type === SaleOrderAttachmentType.PAYMENT_PROOF || item.type === SaleOrderAttachmentType.SALE_PAYMENT_PROOF);
    let inherited = false;
    if (!attachment && !payment.paymentPhoto && payment.correctedFromPaymentId) {
      const original = await this.entityManager.getRepository(SalePaymentEntity).findOne({ where: { id: payment.correctedFromPaymentId } });
      if (original) {
        const originalAttachments = await this.listAttachments.execute({ saleOrderPaymentId: original.id });
        attachment = originalAttachments.find((item) => item.type === SaleOrderAttachmentType.PAYMENT_PROOF || item.type === SaleOrderAttachmentType.SALE_PAYMENT_PROOF);
        inherited = Boolean(attachment || original.paymentPhoto);
        if (!attachment && original.paymentPhoto) {
          payment.paymentPhoto = original.paymentPhoto;
        }
      }
    }
    const url = attachment?.url ?? payment.paymentPhoto ?? null;
    return {
      incomeId,
      saleOrderId: payment.saleOrderId,
      saleOrderPaymentId: incomeId,
      available: Boolean(url),
      status: url ? "AVAILABLE" : payment.status === "CANCELLED" || payment.status === "REVERSED" ? "MISSING_OPTIONAL" : "MISSING_REQUIRED",
      attachmentId: attachment?.id ?? null,
      url,
      originalName: attachment?.originalName ?? (url ? "evidencia-legada" : null),
      mimeType: attachment?.mimeType ?? (url ? "image/*" : null),
      sizeBytes: attachment?.sizeBytes ?? null,
      createdAt: attachment?.createdAt ?? (url ? payment.createdAt.toISOString() : null),
      canView: true,
      canUpload: payment.status === "PENDING_CONFIRMATION" || (payment.status === "POSTED" && Boolean(payment.correctedFromPaymentId)),
      inherited,
    };
  }
}

@Injectable()
export class UploadIncomeEvidenceUsecase {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly getEvidence: GetIncomeEvidenceUsecase,
    private readonly uploadAttachment: UploadSaleOrderAttachmentUsecase,
    @Optional() private readonly realtime?: SaleOrdersRealtimeService,
  ) {}

  async execute(incomeId: string, file: Express.Multer.File, userId: string, idempotencyKey: string, allowCorrectedPosted = false) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey ?? "")) {
      throw new BadRequestException("Envía una clave de idempotencia UUID válida.");
    }
    const payment = await this.entityManager.getRepository(SalePaymentEntity).findOne({ where: { id: incomeId } });
    if (!payment) throw new NotFoundException("Ingreso no encontrado");
    const isCorrectedPosted = allowCorrectedPosted && payment.status === "POSTED" && Boolean(payment.correctedFromPaymentId);
    if (payment.status !== "PENDING_CONFIRMATION" && !isCorrectedPosted) throw new ConflictException("Los ingresos contabilizados o revertidos son de solo lectura");
    let result;
    try {
      result = await this.uploadAttachment.execute({
        saleOrderId: payment.saleOrderId,
        saleOrderPaymentId: incomeId,
        type: SaleOrderAttachmentType.PAYMENT_PROOF,
        file,
        note: "Evidencia cargada desde ingresos.",
        storageArea: "private",
        idempotencyKey,
        onPersisted: async ({ tx, created, previous }) => {
          const manager = (tx as TypeormTransactionContext).manager;
          await manager.query(
            `INSERT INTO sale_order_auditory (sale_order_id, executed_by, action_execution)
             VALUES ($1, $2, 'payment_evidence_attached')`,
            [payment.saleOrderId, userId],
          );
          await manager.query(
            `INSERT INTO financial_outbox_events (event_type, aggregate_type, aggregate_id, payload)
             VALUES ('income.payment_evidence_attached', 'sale_payment', $1, $2::jsonb)`,
            [incomeId, JSON.stringify({
              incomeId,
              saleOrderId: payment.saleOrderId,
              actorId: userId,
              attachmentId: created.id,
              replacedAttachmentIds: previous.map((attachment) => attachment.id),
            })],
          );
        },
      }, userId);
    } catch (error: any) {
      if (error?.driverError?.code === "23505" || error?.code === "23505") {
        throw new ConflictException("Este ingreso ya tiene una evidencia y no se puede reemplazar");
      }
      throw error;
    }
    if (!result?.idempotentReplay) {
      this.realtime?.emitToAllConnected("sale-orders.updated", {
        saleOrderId: payment.saleOrderId,
        incomeId,
        reason: "payment_evidence_attached",
      });
      this.realtime?.emitToAllConnected("income.updated", {
        incomeId,
        saleOrderId: payment.saleOrderId,
        reason: "payment_evidence_attached",
      });
    }
    return result;
  }
}
