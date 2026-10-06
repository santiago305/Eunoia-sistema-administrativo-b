import { ConflictException, Injectable, Logger, NotFoundException, Optional } from "@nestjs/common";
import { InjectEntityManager } from "@nestjs/typeorm";
import { EntityManager } from "typeorm";
import { SalePaymentEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-payment.entity";
import { ListSaleOrderAttachmentsUsecase } from "src/modules/sale-order-attachments/application/usecases/list-sale-order-attachments.usecase";
import { UploadSaleOrderAttachmentUsecase } from "src/modules/sale-order-attachments/application/usecases/upload-sale-order-attachment.usecase";
import { SaleOrderAttachmentType } from "src/modules/sale-order-attachments/domain/value-objects/sale-order-attachment-type";
import { IncomeEvidenceSummary } from "../dtos/income.output";
import { SaleOrderAuditEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order-audit.entity";
import { SaleOrdersRealtimeService } from "src/modules/sale-orders/infrastructure/realtime/sale-orders-realtime.service";

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
    const attachment = attachments.find((item) => item.type === SaleOrderAttachmentType.PAYMENT_PROOF || item.type === SaleOrderAttachmentType.SALE_PAYMENT_PROOF);
    const url = attachment?.url ?? payment.paymentPhoto ?? null;
    return {
      incomeId,
      saleOrderId: payment.saleOrderId,
      saleOrderPaymentId: incomeId,
      available: Boolean(url),
      status: url ? "AVAILABLE" : payment.status === "VOIDED" ? "MISSING_OPTIONAL" : "MISSING_REQUIRED",
      attachmentId: attachment?.id ?? null,
      url,
      originalName: attachment?.originalName ?? (url ? "evidencia-legada" : null),
      mimeType: attachment?.mimeType ?? (url ? "image/*" : null),
      sizeBytes: attachment?.sizeBytes ?? null,
      createdAt: attachment?.createdAt ?? (url ? payment.createdAt.toISOString() : null),
      canView: true,
      canUpload: payment.status === "POSTED" && !url,
    };
  }
}

@Injectable()
export class UploadIncomeEvidenceUsecase {
  private readonly logger = new Logger(UploadIncomeEvidenceUsecase.name);

  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly getEvidence: GetIncomeEvidenceUsecase,
    private readonly uploadAttachment: UploadSaleOrderAttachmentUsecase,
    @Optional() private readonly realtime?: SaleOrdersRealtimeService,
  ) {}

  async execute(incomeId: string, file: Express.Multer.File, userId: string) {
    const payment = await this.entityManager.getRepository(SalePaymentEntity).findOne({ where: { id: incomeId } });
    if (!payment) throw new NotFoundException("Ingreso no encontrado");
    if (payment.status !== "POSTED") throw new ConflictException("Los ingresos anulados son de solo lectura");
    const evidence = await this.getEvidence.execute(incomeId);
    if (evidence.url) throw new ConflictException("Este ingreso ya tiene una evidencia y no se puede reemplazar");
    let result;
    try {
      result = await this.uploadAttachment.execute({ saleOrderId: payment.saleOrderId, saleOrderPaymentId: incomeId, type: SaleOrderAttachmentType.PAYMENT_PROOF, file, note: "Evidencia cargada desde ingresos.", storageArea: "private" }, userId);
    } catch (error: any) {
      if (error?.driverError?.code === "23505" || error?.code === "23505") {
        throw new ConflictException("Este ingreso ya tiene una evidencia y no se puede reemplazar");
      }
      throw error;
    }
    try {
      await this.entityManager.getRepository(SaleOrderAuditEntity).save({
        saleOrderId: payment.saleOrderId,
        executedBy: userId,
        actionExecution: "payment_evidence_attached",
      });
    } catch (error) {
      this.logger.error(`No se pudo registrar la auditoría de evidencia para el pago ${incomeId}`, error instanceof Error ? error.stack : undefined);
    }
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
    return result;
  }
}
