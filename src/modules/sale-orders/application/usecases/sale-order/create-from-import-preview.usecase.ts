import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import {
  SALE_ORDER_ITEM_COMPONENT_REPOSITORY,
  SaleOrderItemComponentRepository,
} from 'src/modules/sale-orders/domain/ports/sale-order-item-component.repository';
import {
  SALE_ORDER_ITEM_REPOSITORY,
  SaleOrderItemRepository,
} from 'src/modules/sale-orders/domain/ports/sale-order-item.repository';
import {
  SALE_ORDER_REPOSITORY,
  SaleOrderRepository,
} from 'src/modules/sale-orders/domain/ports/sale-order.repository';
import {
  SALE_PAYMENT_REPOSITORY,
  SalePaymentRepository,
} from 'src/modules/sale-orders/domain/ports/sale-payment.repository';
import {
  SaleOrderImportPreviewCleanRow,
  CreateSaleOrdersFromImportPreviewOutput,
} from 'src/modules/sale-orders/application/dtos/import-preview/create-sale-orders-from-preview.input';
import { SaleOrderImportClientResolverService } from 'src/modules/sale-orders/application/services/sale-order-import-client-resolver.service';
import { SaleOrderImportRowNormalizerService } from 'src/modules/sale-orders/application/services/sale-order-import-row-normalizer.service';
import { SaleOrderImportSkuResolverService } from 'src/modules/sale-orders/application/services/sale-order-import-sku-resolver.service';
import { SaleOrderImportSourceResolverService } from 'src/modules/sale-orders/application/services/sale-order-import-source-resolver.service';
import {
  TransactionContext,
  UNIT_OF_WORK,
  UnitOfWork,
} from 'src/shared/domain/ports/unit-of-work.port';
import {
  WORKFLOW_REPOSITORY,
  WorkflowRepository,
} from 'src/modules/workflow/domain/ports/workflow.repository';
import { SaleOrderNumberingService } from 'src/modules/sale-orders/application/services/sale-order-numbering.service';
import { SaleOrderImportAdviserResolverService } from 'src/modules/sale-orders/application/services/sale-order-import-adviser-resolver.service';
import { AssignImportLoteUsecase } from './assign-import-lote.usecase';
import { SaleOrderSuppliesService } from '../../services/sale-order-supplies.service';
import {
  SaleOrderPackMatcherService,
  SaleOrderPackMatchResult,
} from '../../services/sale-order-pack-matcher.service';
import { businessDateAsUtcMidnight } from 'src/shared/utilidades/utils/business-date';

type ImportDestination = {
  agencySubsidiaryId: string | null;
  agencyDetail: string | null;
  sendAddress: string | null;
  clientAddress: string | null;
};

type ResolvedImportSku = {
  productId: string;
  skuId: string;
  skuName: string;
  customSku: string;
  quantity: number;
};

type ImportedItemComponentPlan = {
  skuId: string;
  referencePackItemId: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
};

type ImportedItemPlan = {
  referencePackId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  components: ImportedItemComponentPlan[];
};

export enum PaymentDescription {
  ANTICIPO = 'Anticipo',
  SALDO = 'Saldo',
}

@Injectable()
export class CreateFromImportPreviewUseCase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    @Inject(SALE_ORDER_ITEM_REPOSITORY)
    private readonly saleOrderItemRepo: SaleOrderItemRepository,
    @Inject(SALE_ORDER_ITEM_COMPONENT_REPOSITORY)
    private readonly saleOrderItemComponentRepo: SaleOrderItemComponentRepository,
    @Inject(SALE_PAYMENT_REPOSITORY)
    private readonly salePaymentRepo: SalePaymentRepository,
    private readonly importRowNormalizer: SaleOrderImportRowNormalizerService,
    private readonly clientResolver: SaleOrderImportClientResolverService,
    private readonly sourceResolver: SaleOrderImportSourceResolverService,
    private readonly skuResolver: SaleOrderImportSkuResolverService,
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: WorkflowRepository,
    private readonly numbering: SaleOrderNumberingService,
    private readonly assignImportLote: AssignImportLoteUsecase,
    private readonly packMatcher: SaleOrderPackMatcherService,
    @Optional()
    private readonly adviserResolver?: SaleOrderImportAdviserResolverService,
    @Optional()
    private readonly suppliesService?: SaleOrderSuppliesService,
  ) {}

  async execute(input: {
    rows: SaleOrderImportPreviewCleanRow[];
    userId: string;
  }): Promise<CreateSaleOrdersFromImportPreviewOutput> {
    const errors: Array<{ rowNumber: number; message: string }> = [];
    const createdRows: CreateSaleOrdersFromImportPreviewOutput['rows'] = [];

    const unknownProductErrors: Array<{ rowNumber: number; message: string }> =
      [];

    for (let index = 0; index < (input.rows ?? []).length; index++) {
      const rowNumber = index + 2;
      const normalized = await this.importRowNormalizer.normalize(
        input.rows[index] ?? {},
        rowNumber,
      );
      if (!normalized.ok) continue;

      try {
        await this.skuResolver.resolveOrCreateSkus(normalized.row.parsedSkus);
      } catch (error) {
        unknownProductErrors.push({
          rowNumber,
          message:
            error instanceof Error ? error.message : 'Producto no registrado',
        });
      }
    }

    if (unknownProductErrors.length > 0) {
      const details = unknownProductErrors
        .map((error) => `fila ${error.rowNumber}: ${error.message}`)
        .join(' | ');

      throw new BadRequestException(
        `No se puede importar el despacho porque existen productos no registrados. ${details}`,
      );
    }

    for (let index = 0; index < (input.rows ?? []).length; index++) {
      const rowNumber = index + 2;
      const cleanRow = input.rows[index] ?? {};

      const normalized = await this.importRowNormalizer.normalize(
        cleanRow,
        rowNumber,
      );
      if (!normalized.ok) {
        const failed = normalized as Extract<typeof normalized, { ok: false }>;
        errors.push({ rowNumber, message: failed.errors.join(' | ') });
        continue;
      }

      try {
        const result = await this.uow.runInTransaction(async (tx) => {
          const destination = this.resolveImportDestination(
            normalized.row.address,
          );
          const clientId = await this.clientResolver.resolveOrCreate(
            { ...normalized.row, address: destination.clientAddress },
            tx,
          );
          const sourceId = await this.sourceResolver.resolveOrCreate(
            normalized.row.internalNote,
            tx,
          );
          const skus = await this.skuResolver.resolveOrCreateSkus(
            normalized.row.parsedSkus,
            tx,
          );

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
        errors.push({
          rowNumber,
          message:
            error instanceof Error ? error.message : 'Error al importar fila',
        });
      }
    }

    const lote = await this.assignImportLote.execute({
      saleOrderIds: createdRows.map((row) => row.saleOrderId),
      createdBy: input.userId,
    });

    return {
      totalRows: input.rows?.length ?? 0,
      processedRows: createdRows.length,
      importedRows: createdRows.length,
      failedRows: errors.length,
      lote,
      rows: createdRows,
      errors,
    };
  }

  private async createSaleOrderFromImportRow(input: {
    row: {
      deliveryDate: string | null;
      orderDate: string | null;
      workflowName: string | null;
      address: string | null;
      productName: string | null;
      internalNote: string | null;
      advertisingCode: string | null;
      total: number;
      advance: number;
      deliveryCost?: number;
      couponCode: string | null;
      confirmedBy?: string | null;
    };
    destination: ImportDestination;
    clientId: string;
    sourceId: string;
    userId: string;
    skus: ResolvedImportSku[];
    tx: TransactionContext;
  }): Promise<string> {
    const warehouseId = null;

    const total = this.roundMoney(Number(input.row.total ?? 0));
    const advance = Number(input.row.advance ?? 0);
    const deliveryCost = this.roundMoney(Number(input.row.deliveryCost ?? 0));
    const subTotal = this.roundMoney(Math.max(total - deliveryCost, 0));

    const { serie, correlative } = await this.numbering.reserveNext(input.tx);
    const deliveryDate = input.row.deliveryDate;
    const orderDate = input.row.orderDate;
    const createdAt = null;
    const normalizedWorkflowName = this.normalizeWorkflowName(
      input.row.workflowName,
    );
    const resolvedWorkflow = normalizedWorkflowName
      ? await this.workflowRepo.findActiveByNormalizedName(
          normalizedWorkflowName,
          input.tx,
        )
      : null;
    const assignedBy = await this.resolveImportedAdviserId(
      input.row.confirmedBy,
      input.tx,
    );

    const saleOrder = await this.saleOrderRepo.create(
      {
        serie,
        correlative,
        warehouseId,
        clientId: input.clientId,
        agencySubsidiaryId: input.destination.agencySubsidiaryId,
        agencyDetail: input.destination.agencyDetail,
        sourceId: input.sourceId,
        scheduleDate: orderDate,
        deliveryDate: deliveryDate,
        subTotal,
        deliveryCost,
        total,
        note: input.row.internalNote ?? null,
        advertisingCode: input.row.advertisingCode,
        observation: null,
        sendAddress: input.destination.sendAddress,
        assignedBy,
        createdBy: input.userId,
        createdAt,
        workflowId: resolvedWorkflow?.workflow.id ?? null,
        currentStateId: resolvedWorkflow?.initialState.id ?? null,
        isActive: true,
      },
      input.tx,
    );

    const saleOrderId = this.getEntityId(
      (saleOrder as any).saleOrderId ?? (saleOrder as any).id,
    );

    const itemDescription = input.row.productName?.trim() || 'Sin nombre';
    const itemPlans = await this.buildImportedItemPlans({
      description: itemDescription,
      subTotal,
      skus: input.skus,
      tx: input.tx,
    });

    const items = await this.saleOrderItemRepo.bulkCreate(
      itemPlans.map((itemPlan) => ({
        saleOrderId,
        referencePackId: itemPlan.referencePackId,
        description: itemPlan.description,
        quantity: itemPlan.quantity,
        unitPrice: itemPlan.unitPrice,
        total: itemPlan.total,
      })),
      input.tx,
    );

    for (let index = 0; index < itemPlans.length; index++) {
      const saleOrderItemId = this.getEntityId(
        (items[index] as any)?.saleOrderItemId ?? (items[index] as any)?.id,
      );
      await this.saleOrderItemComponentRepo.bulkCreate(
        itemPlans[index].components.map((component) => ({
          saleOrderItemId,
          ...component,
        })),
        input.tx,
      );
    }

    if (resolvedWorkflow && this.suppliesService) {
      await this.suppliesService.copyFromWorkflowRecipe(
        saleOrderId,
        resolvedWorkflow.workflow.id,
        input.tx,
      );
    }

    if (advance > 0) {
      await this.salePaymentRepo.bulkCreate(
        [
          {
            saleOrderId,
            bankAccountId: null,
            date: businessDateAsUtcMidnight(),
            method: 'import_adelanto' as any,
            operationNumber: null,
            amount: advance,
            note: PaymentDescription.ANTICIPO,
          },
        ],
        input.tx,
      );
    }

    return saleOrderId;
  }

  private async buildImportedItemPlans(input: {
    description: string;
    subTotal: number;
    skus: ResolvedImportSku[];
    tx: TransactionContext;
  }): Promise<ImportedItemPlan[]> {
    const skus = this.aggregateImportedSkus(input.skus);

    if (skus.length === 0) {
      throw new BadRequestException(
        'La fila importada no contiene productos validos',
      );
    }

    if (skus.length === 1) {
      const sku = skus[0];
      const total = this.roundMoney(input.subTotal);
      const unitPrice = this.divideMoney(total, sku.quantity);

      return [{
        referencePackId: null,
        description: input.description,
        quantity: sku.quantity,
        unitPrice,
        total,
        components: [
          {
            skuId: sku.skuId,
            referencePackItemId: null,
            quantity: sku.quantity,
            unitPrice,
            total,
          },
        ],
      }];
    }

    const match = await this.packMatcher.decompose(
      skus.map((sku) => ({
        skuId: sku.skuId,
        quantity: sku.quantity,
      })),
      input.tx,
    );

    if (match.status !== 'UNIQUE' || match.leftovers.length === 0) {
      return [this.buildGroupedItemPlan({
        description: input.description,
        subTotal: input.subTotal,
        skus,
        match:
          match.status === 'UNIQUE'
            ? {
                status: 'UNIQUE',
                composition: match.composition,
                pack: match.pack,
                matches: match.matches,
              }
            : match,
      })];
    }

    return this.buildPartialPackItemPlans({
      description: input.description,
      subTotal: input.subTotal,
      skus,
      match,
    });
  }

  private buildPartialPackItemPlans(input: {
    description: string;
    subTotal: number;
    skus: ResolvedImportSku[];
    match: Extract<
      Awaited<ReturnType<SaleOrderPackMatcherService['decompose']>>,
      { status: 'UNIQUE' }
    >;
  }): ImportedItemPlan[] {
    const packTotal = this.roundMoney(
      Number(input.match.pack.pack.total ?? 0) * input.match.packQuantity,
    );
    if (packTotal > this.roundMoney(input.subTotal)) {
      throw new BadRequestException(
        `El precio del pack ${input.match.pack.pack.description} supera el subtotal importado`,
      );
    }

    const packComponentWeights = input.match.pack.items.map((item) =>
      Number(item.lineTotal ?? 0) * input.match.packQuantity,
    );
    const packComponentTotals = this.allocateMoney(
      packTotal,
      packComponentWeights,
    );
    const packPlan: ImportedItemPlan = {
      referencePackId: input.match.pack.pack.packId.value,
      description: input.match.pack.pack.description,
      quantity: input.match.packQuantity,
      unitPrice: this.divideMoney(packTotal, input.match.packQuantity),
      total: packTotal,
      components: input.match.pack.items.map((item, index) => {
        const quantity = this.roundQuantity(
          Number(item.quantity) * input.match.packQuantity,
        );
        const total = packComponentTotals[index] ?? 0;
        return {
          skuId: item.skuId,
          referencePackItemId: item.id,
          quantity,
          unitPrice: this.divideMoney(total, quantity),
          total,
        };
      }),
    };

    const remainingTotal = this.roundMoney(input.subTotal - packTotal);
    const packItemBySkuId = new Map(
      input.match.pack.items.map((item) => [item.skuId, item]),
    );
    const leftoverWeights = input.match.leftovers.map((leftover) => {
      const unitWeight = Number(
        packItemBySkuId.get(leftover.skuId)?.price ?? 0,
      );
      return unitWeight > 0
        ? unitWeight * leftover.quantity
        : leftover.quantity;
    });
    const leftoverTotals = this.allocateMoney(remainingTotal, leftoverWeights);
    const skuById = new Map(input.skus.map((sku) => [sku.skuId, sku]));

    return [
      packPlan,
      ...input.match.leftovers.map((leftover, index) => {
        const total = leftoverTotals[index] ?? 0;
        const sku = skuById.get(leftover.skuId);
        const description = sku?.skuName?.trim() || input.description;
        return {
          referencePackId: null,
          description,
          quantity: leftover.quantity,
          unitPrice: this.divideMoney(total, leftover.quantity),
          total,
          components: [
            {
              skuId: leftover.skuId,
              referencePackItemId: null,
              quantity: leftover.quantity,
              unitPrice: this.divideMoney(total, leftover.quantity),
              total,
            },
          ],
        };
      }),
    ];
  }

  private buildGroupedItemPlan(input: {
    description: string;
    subTotal: number;
    skus: ResolvedImportSku[];
    match: SaleOrderPackMatchResult;
  }): ImportedItemPlan {
    const matchedPack =
      input.match.status === 'UNIQUE' ? input.match.pack : null;
    const packItemBySkuId = new Map(
      (matchedPack?.items ?? []).map((item) => [item.skuId, item]),
    );
    const packWeights = input.skus.map((sku) =>
      Number(packItemBySkuId.get(sku.skuId)?.lineTotal ?? 0),
    );
    const weights =
      matchedPack && packWeights.every((weight) => weight > 0)
        ? packWeights
        : input.skus.map((sku) => sku.quantity);
    const allocatedTotals = this.allocateMoney(input.subTotal, weights);

    return {
      referencePackId: matchedPack?.pack.packId.value ?? null,
      description: matchedPack?.pack.description ?? input.description,
      quantity: 1,
      unitPrice: this.roundMoney(input.subTotal),
      total: this.roundMoney(input.subTotal),
      components: input.skus.map((sku, index) => {
        const componentTotal = allocatedTotals[index] ?? 0;
        return {
          skuId: sku.skuId,
          referencePackItemId: packItemBySkuId.get(sku.skuId)?.id ?? null,
          quantity: sku.quantity,
          unitPrice: this.divideMoney(componentTotal, sku.quantity),
          total: componentTotal,
        };
      }),
    };
  }

  private aggregateImportedSkus(
    skus: ResolvedImportSku[],
  ): ResolvedImportSku[] {
    const bySkuId = new Map<string, ResolvedImportSku>();

    for (const sku of skus) {
      const skuId = sku.skuId?.trim();
      const quantity = this.roundQuantity(Number(sku.quantity ?? 0));
      if (!skuId || quantity <= 0) continue;

      const current = bySkuId.get(skuId);
      if (current) {
        current.quantity = this.roundQuantity(current.quantity + quantity);
        continue;
      }

      bySkuId.set(skuId, { ...sku, skuId, quantity });
    }

    return [...bySkuId.values()].sort((left, right) =>
      left.skuId.localeCompare(right.skuId),
    );
  }

  private allocateMoney(total: number, weights: number[]): number[] {
    if (weights.length === 0) return [];

    const targetCents = Math.round(this.roundMoney(total) * 100);
    const normalizedWeights = weights.map((weight) =>
      Number.isFinite(weight) && weight > 0 ? weight : 0,
    );
    const totalWeight = normalizedWeights.reduce(
      (sum, weight) => sum + weight,
      0,
    );
    const effectiveWeights =
      totalWeight > 0 ? normalizedWeights : weights.map(() => 1);
    const effectiveTotalWeight = effectiveWeights.reduce(
      (sum, weight) => sum + weight,
      0,
    );
    let assignedCents = 0;

    return effectiveWeights.map((weight, index) => {
      const cents =
        index === effectiveWeights.length - 1
          ? targetCents - assignedCents
          : Math.floor((targetCents * weight) / effectiveTotalWeight);
      assignedCents += cents;
      return cents / 100;
    });
  }

  private divideMoney(total: number, quantity: number): number {
    return quantity > 0 ? this.roundMoney(total / quantity) : 0;
  }

  private roundMoney(value: number): number {
    return Math.round((Number(value ?? 0) + Number.EPSILON) * 100) / 100;
  }

  private roundQuantity(value: number): number {
    return Math.round((Number(value ?? 0) + Number.EPSILON) * 100) / 100;
  }

  private resolveImportDestination(address: string | null): ImportDestination {
    const rawAddress = address?.trim() || null;
    return {
      agencySubsidiaryId: null,
      agencyDetail: rawAddress,
      sendAddress: null,
      clientAddress: null,
    };
  }

  private getEntityId(value: any): string {
    if (typeof value === 'string') return value;
    if (value?.value) return value.value;
    if (value?.id) return value.id;
    throw new BadRequestException('No se pudo resolver el ID de entidad');
  }

  private normalizeWorkflowName(
    value: string | null | undefined,
  ): string | null {
    const trimmed = String(value ?? '')
      .trim()
      .replace(/\s+/g, ' ');
    return trimmed ? trimmed.toLocaleUpperCase('es-PE') : null;
  }

  private async resolveImportedAdviserId(
    value: string | null | undefined,
    tx: TransactionContext,
  ) {
    return this.adviserResolver?.resolveByName(value, tx) ?? null;
  }
}
