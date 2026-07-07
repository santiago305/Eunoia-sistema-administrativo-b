import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { SALE_ORDER_ITEM_COMPONENT_REPOSITORY, SaleOrderItemComponentRepository } from "src/modules/sale-orders/domain/ports/sale-order-item-component.repository";
import { SALE_ORDER_ITEM_REPOSITORY, SaleOrderItemRepository } from "src/modules/sale-orders/domain/ports/sale-order-item.repository";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SALE_PAYMENT_REPOSITORY, SalePaymentRepository } from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import { SaleOrderImportPreviewCleanRow, CreateSaleOrdersFromImportPreviewOutput } from "src/modules/sale-orders/application/dtos/import-preview/create-sale-orders-from-preview.input";
import { SaleOrderImportClientResolverService } from "src/modules/sale-orders/application/services/sale-order-import-client-resolver.service";
import { SaleOrderImportRowNormalizerService } from "src/modules/sale-orders/application/services/sale-order-import-row-normalizer.service";
import { SaleOrderImportSkuResolverService } from "src/modules/sale-orders/application/services/sale-order-import-sku-resolver.service";
import { SaleOrderImportSourceResolverService } from "src/modules/sale-orders/application/services/sale-order-import-source-resolver.service";
import { TransactionContext, UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { WORKFLOW_REPOSITORY, WorkflowRepository } from "src/modules/workflow/domain/ports/workflow.repository";
import { SaleOrderNumberingService } from "src/modules/sale-orders/application/services/sale-order-numbering.service";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { SubsidiaryEntity } from "src/modules/agencies/adapters/out/persistence/typeorm/entities/subsidiary.entity";

type ImportDestination = {
  agencySubsidiaryId: string | null;
  sendAddress: string | null;
  clientAddress: string | null;
};

@Injectable()
export class CreateFromImportPreviewUseCase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(SALE_ORDER_REPOSITORY) private readonly saleOrderRepo: SaleOrderRepository,
    @Inject(SALE_ORDER_ITEM_REPOSITORY) private readonly saleOrderItemRepo: SaleOrderItemRepository,
    @Inject(SALE_ORDER_ITEM_COMPONENT_REPOSITORY) private readonly saleOrderItemComponentRepo: SaleOrderItemComponentRepository,
    @Inject(SALE_PAYMENT_REPOSITORY) private readonly salePaymentRepo: SalePaymentRepository,
    private readonly importRowNormalizer: SaleOrderImportRowNormalizerService,
    private readonly clientResolver: SaleOrderImportClientResolverService,
    private readonly sourceResolver: SaleOrderImportSourceResolverService,
    private readonly skuResolver: SaleOrderImportSkuResolverService,
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: WorkflowRepository,
    private readonly numbering: SaleOrderNumberingService,
  ) {}

  async execute(input: { rows: SaleOrderImportPreviewCleanRow[]; userId: string }): Promise<CreateSaleOrdersFromImportPreviewOutput> {
    const errors: Array<{ rowNumber: number; message: string }> = [];
    const createdRows: CreateSaleOrdersFromImportPreviewOutput["rows"] = [];

    for (let index = 0; index < (input.rows ?? []).length; index++) {
      const rowNumber = index + 2;
      const cleanRow = input.rows[index] ?? {};

      const normalized = await this.importRowNormalizer.normalize(cleanRow, rowNumber);
      if (!normalized.ok) {
        const failed = normalized as Extract<typeof normalized, { ok: false }>;
        errors.push({ rowNumber, message: failed.errors.join(" | ") });
        continue;
      }

      try {
        const result = await this.uow.runInTransaction(async (tx) => {
          const destination = await this.resolveImportDestination(
            normalized.row.address,
            tx,
          );
          const clientId = await this.clientResolver.resolveOrCreate(
            { ...normalized.row, address: destination.clientAddress },
            tx,
          );
          const sourceId = await this.sourceResolver.resolveOrCreate(normalized.row.internalNote, tx);
          const skus = await this.skuResolver.resolveOrCreateSkus(normalized.row.parsedSkus, tx);

          const saleOrderId = await this.createSaleOrderFromImportRow({
            row: normalized.row,
            destination,
            clientId,
            sourceId,
            userId: input.userId,
            skus,
            tx,
          });

          return { clientId, sourceId, saleOrderId, skus };
        });

        createdRows.push({
          rowNumber,
          clientId: result.clientId,
          sourceId: result.sourceId,
          saleOrderId: result.saleOrderId,
          skus: result.skus,
        });
      } catch (error) {
        errors.push({ rowNumber, message: error instanceof Error ? error.message : "Error al importar fila" });
      }
    }

    return {
      totalRows: input.rows?.length ?? 0,
      processedRows: createdRows.length,
      importedRows: createdRows.length,
      failedRows: errors.length,
      rows: createdRows,
      errors,
    };
  }

  private async createSaleOrderFromImportRow(input: {
    row: {
      deliveryDate: string | null;
      workflowName: string | null;
      address: string | null;
      productName: string | null;
      internalNote: string | null;
      advertisingCode: string | null;
      total: number;
      advance: number;
      deliveryCost?:number;
      couponCode: string | null;
    };
    destination: ImportDestination;
    clientId: string;
    sourceId: string;
    userId: string;
    skus: Array<{ productId: string; skuId: string; skuName: string; customSku: string; quantity: number }>;
    tx: TransactionContext;
  }): Promise<string> {
    const warehouseId = null;

    const total = Number(input.row.total ?? 0);
    const advance = Number(input.row.advance ?? 0);
    const deliveryCost = Number(input.row.deliveryCost ?? 0);
    const subTotal = Math.max(total - deliveryCost, 0);

    const { serie, correlative } = await this.numbering.reserveNext(input.tx);
    const deliveryDate = input.row.deliveryDate;
    const normalizedWorkflowName = this.normalizeWorkflowName(input.row.workflowName);
    const resolvedWorkflow = normalizedWorkflowName
      ? await this.workflowRepo.findActiveByNormalizedName(normalizedWorkflowName, input.tx)
      : null;

    const saleOrder = await this.saleOrderRepo.create(
      {
        serie,
        correlative,
        warehouseId,
        clientId: input.clientId,
        agencySubsidiaryId: input.destination.agencySubsidiaryId,
        sourceId: input.sourceId,
        scheduleDate: deliveryDate,
        deliveryDate,
        subTotal,
        deliveryCost,
        total,
        note: input.row.internalNote ?? null,
        advertisingCode: input.row.advertisingCode,
        observation: null,
        sendAddress: input.destination.sendAddress,
        createdBy: input.userId,
        workflowId: resolvedWorkflow?.workflow.id ?? null,
        currentStateId: resolvedWorkflow?.initialState.id ?? null,
        isActive: true,
      },
      input.tx,
    );

    const saleOrderId = this.getEntityId((saleOrder as any).saleOrderId ?? (saleOrder as any).id);

    const itemDescription = input.row.productName?.trim() || "Sin nombre";
    
    const items = await this.saleOrderItemRepo.bulkCreate(
      [
        {
          saleOrderId,
          referencePackId: null,
          description: itemDescription,
          quantity: 1,
          unitPrice: subTotal,
          total: subTotal,
        },
      ],
      input.tx,
    );

    const saleOrderItemId = this.getEntityId((items[0] as any)?.saleOrderItemId ?? (items[0] as any)?.id);

    const totalUnits = input.skus.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const unitComponentPrice = totalUnits > 0 ? subTotal / totalUnits : 0;

    await this.saleOrderItemComponentRepo.bulkCreate(
      input.skus.map((sku) => ({
        saleOrderItemId,
        skuId: sku.skuId,
        referencePackItemId: null,
        quantity: sku.quantity,
        unitPrice: unitComponentPrice,
        total: unitComponentPrice * sku.quantity,
      })),
      input.tx,
    );

    if (advance > 0) {
      await this.salePaymentRepo.bulkCreate(
        [
          {
            saleOrderId,
            bankAccountId: null,
            date: new Date(),
            method: "import_adelanto" as any,
            operationNumber: null,
            amount: advance,
            note: "ADELANTO",
          },
        ],
        input.tx,
      );
    }

    return saleOrderId;
  }

  private async resolveImportDestination(
    address: string | null,
    tx: TransactionContext,
  ): Promise<ImportDestination> {
    const rawAddress = address?.trim() || null;
    if (!rawAddress) {
      return { agencySubsidiaryId: null, sendAddress: null, clientAddress: null };
    }

    const manager = (tx as TypeormTransactionContext).manager;
    if (!manager) {
      return {
        agencySubsidiaryId: null,
        sendAddress: null,
        clientAddress: rawAddress,
      };
    }

    const subsidiary = await manager
      .getRepository(SubsidiaryEntity)
      .createQueryBuilder("subsidiary")
      .where("subsidiary.isActive = true")
      .andWhere(
        "unaccent(lower(trim(subsidiary.alias))) = unaccent(lower(trim(:alias)))",
        { alias: rawAddress },
      )
      .getOne();

    if (!subsidiary) {
      return {
        agencySubsidiaryId: null,
        sendAddress: null,
        clientAddress: rawAddress,
      };
    }

    return {
      agencySubsidiaryId: subsidiary.id,
      sendAddress: subsidiary.address ?? rawAddress,
      clientAddress: null,
    };
  }

  private getEntityId(value: any): string {
    if (typeof value === "string") return value;
    if (value?.value) return value.value;
    if (value?.id) return value.id;
    throw new BadRequestException("No se pudo resolver el ID de entidad");
  }

  private normalizeWorkflowName(value: string | null | undefined): string | null {
    const trimmed = String(value ?? "").trim().replace(/\s+/g, " ");
    return trimmed ? trimmed.toLocaleUpperCase("es-PE") : null;
  }
}
