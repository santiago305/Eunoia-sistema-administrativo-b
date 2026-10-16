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
import { PreferredCompanyPaymentMethodService } from 'src/modules/payment-methods/application/services/preferred-company-payment-method.service';
import { canonicalPaymentMethodName } from 'src/modules/payment-methods/domain/value-objects/payment-method-catalog';
import { SaleOrderImportClientResolverService } from 'src/modules/sale-orders/application/services/sale-order-import-client-resolver.service';
import { SaleOrderImportRowNormalizerService } from 'src/modules/sale-orders/application/services/sale-order-import-row-normalizer.service';
import { SaleOrderImportSkuResolverService } from 'src/modules/sale-orders/application/services/sale-order-import-sku-resolver.service';
import { SaleOrderImportSourceResolverService } from 'src/modules/sale-orders/application/services/sale-order-import-source-resolver.service';
import {
  TransactionContext,
  UNIT_OF_WORK,
  UnitOfWork,
} from 'src/shared/domain/ports/unit-of-work.port';
import { TypeormTransactionContext } from 'src/shared/infrastructure/typeorm/typeorm.transaction-context';
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
import {
  divideMoneyByQuantity,
  fromMinorUnits,
  multiplyMoneyByQuantity,
  roundMoney,
  toMinorUnits,
} from 'src/modules/sale-orders/domain/value-objects/money';
import { resolveSaleOrderCompanyId } from '../../services/sale-order-company-resolver';

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
  price: number;
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
    private readonly preferredPaymentMethod: PreferredCompanyPaymentMethodService,
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
    const warnings: Array<{ rowNumber: number; message: string }> = [];
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

          const saleOrder = await this.createSaleOrderFromImportRow({
            row: normalized.row,
            destination,
            clientId,
            sourceId,
            userId: input.userId,
            skus,
            tx,
          });

          return { clientId, sourceId, ...saleOrder, skus };
        });

        createdRows.push({
          rowNumber,
          clientId: result.clientId,
          sourceId: result.sourceId,
          saleOrderId: result.saleOrderId,
          skus: result.skus,
        });
        if (result.pricingWarning) {
          warnings.push({ rowNumber, message: result.pricingWarning });
        }
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
      warnings,
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
  }): Promise<{ saleOrderId: string; pricingWarning: string | null }> {
    const warehouseId = null;

    const total = roundMoney(input.row.total ?? 0);
    const advance = roundMoney(input.row.advance ?? 0);
    const deliveryCost = roundMoney(input.row.deliveryCost ?? 0);
    const importedSubTotal = fromMinorUnits(
      Math.max(toMinorUnits(total) - toMinorUnits(deliveryCost), 0),
    );

    const itemDescription = input.row.productName?.trim() || 'Sin nombre';
    const referenceItemPlans = await this.buildImportedItemPlans({
      description: itemDescription,
      subTotal: importedSubTotal,
      skus: input.skus,
      tx: input.tx,
    });
    const itemPlans = this.reconcileImportedPricing(
      referenceItemPlans,
      importedSubTotal,
    );
    const subTotal = fromMinorUnits(
      itemPlans.reduce((sum, item) => sum + toMinorUnits(item.total), 0),
    );
    const discount = fromMinorUnits(
      Math.max(
        toMinorUnits(subTotal) + toMinorUnits(deliveryCost) - toMinorUnits(total),
        0,
      ),
    );
    const pricingWarning = this.buildPricingWarning({
      description: itemDescription,
      importedTotal: total,
      referenceSubTotal: fromMinorUnits(
        referenceItemPlans.reduce((sum, item) => sum + toMinorUnits(item.total), 0),
      ),
      discount,
      deliveryCost,
    });

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
    if (input.row.confirmedBy?.trim() && !assignedBy) {
      throw new BadRequestException(
        `Asesor no reconocido en Confirmado por: ${input.row.confirmedBy.trim()}`,
      );
    }

    const saleOrder = await this.saleOrderRepo.create(
      {
        companyId: await resolveSaleOrderCompanyId(
          (input.tx as TypeormTransactionContext).manager,
          input.userId,
        ),
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
        discount,
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
      const preferredMethod = await this.preferredPaymentMethod.resolve(input.tx);
      const [advancePayment] = await this.salePaymentRepo.bulkCreate(
        [
          {
            saleOrderId,
            companyPaymentAccountId: null,
            paymentMethodId: preferredMethod.paymentMethodId,
            status: 'PENDING_CONFIRMATION',
            date: businessDateAsUtcMidnight(),
            method: canonicalPaymentMethodName(preferredMethod.method),
            operationNumber: null,
            amount: advance,
            note: PaymentDescription.ANTICIPO,
            createdByUserId: input.userId,
          },
        ],
        input.tx,
      );
      if (!advancePayment) {
        throw new Error('No se pudo registrar el anticipo importado');
      }
      const manager = (input.tx as TypeormTransactionContext).manager;
      if (!manager) {
        throw new Error('La auditoria del anticipo requiere la transaccion del pedido');
      }
      await manager.query(
        `INSERT INTO sale_order_auditory (sale_order_id, executed_by, action_execution)
         VALUES ($1, $2, $3)`,
        [saleOrderId, input.userId, 'payment_pending_created'],
      );
      await manager.query(
        `INSERT INTO financial_outbox_events (event_type, aggregate_type, aggregate_id, payload)
         VALUES ($1, 'sale_payment', $2, $3::jsonb)`,
        [
          'income.payment_pending_created',
          advancePayment.id,
          JSON.stringify({
            incomeId: advancePayment.id,
            saleOrderId,
            actorId: input.userId,
            details: {
              status: 'PENDING_CONFIRMATION',
              amount: advance,
              source: 'sale_order_import',
            },
          }),
        ],
      );
    }

    return { saleOrderId, pricingWarning };
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
      const referenceTotal = roundMoney(
        Number(sku.price) > 0
          ? multiplyMoneyByQuantity(sku.price, sku.quantity)
          : input.subTotal,
      );
      const total = referenceTotal;
      const unitPrice = divideMoneyByQuantity(total, sku.quantity);

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

    if (match.status !== 'UNIQUE') {
      return [this.buildGroupedItemPlan({
        description: input.description,
        subTotal: input.subTotal,
        skus,
        match,
      })];
    }

    return this.buildPartialPackItemPlans({
      skus,
      match,
    });
  }

  private buildPartialPackItemPlans(input: {
    skus: ResolvedImportSku[];
    match: Extract<
      Awaited<ReturnType<SaleOrderPackMatcherService['decompose']>>,
      { status: 'UNIQUE' }
    >;
  }): ImportedItemPlan[] {
    const packTotal = multiplyMoneyByQuantity(
      input.match.pack.pack.total ?? 0,
      input.match.packQuantity,
    );

    const packComponentWeights = input.match.pack.items.map((item) =>
      this.getPackItemReferenceTotal(item, input.match),
    );
    const packComponentTotals = this.allocateMoney(
      packTotal,
      packComponentWeights,
    );
    const packPlan: ImportedItemPlan = {
      referencePackId: input.match.pack.pack.packId.value,
      description: input.match.pack.pack.description,
      quantity: input.match.packQuantity,
      unitPrice: divideMoneyByQuantity(packTotal, input.match.packQuantity),
      total: packTotal,
      components: input.match.pack.items.map((item, index) => {
        const quantity = this.getPackItemQuantity(item, input.match);
        const total = packComponentTotals[index] ?? 0;
        return {
          skuId: item.skuId,
          referencePackItemId: item.id,
          quantity,
          unitPrice: divideMoneyByQuantity(total, quantity),
          total,
        };
      }),
    };

    const packItemBySkuId = new Map(
      input.match.pack.items.map((item) => [item.skuId, item]),
    );
    const skuById = new Map(input.skus.map((sku) => [sku.skuId, sku]));
    const leftoverWeights = input.match.leftovers.map((leftover) => {
      const skuPrice = Number(skuById.get(leftover.skuId)?.price ?? 0);
      const packItemPrice = Number(
        packItemBySkuId.get(leftover.skuId)?.price ?? 0,
      );
      const unitWeight = skuPrice > 0 ? skuPrice : packItemPrice;
      return unitWeight > 0
        ? multiplyMoneyByQuantity(unitWeight, leftover.quantity)
        : leftover.quantity;
    });
    const leftoverReferenceTotal = fromMinorUnits(
      leftoverWeights.reduce((sum, weight) => sum + toMinorUnits(weight), 0),
    );
    const leftoverTotals = this.allocateMoney(
      leftoverReferenceTotal,
      leftoverWeights,
    );

    return [
      packPlan,
      ...input.match.leftovers.map((leftover, index) => {
        const total = leftoverTotals[index] ?? 0;
        const sku = skuById.get(leftover.skuId);
        const description = sku?.skuName?.trim() || 'Producto importado';
        return {
          referencePackId: null,
          description,
          quantity: leftover.quantity,
          unitPrice: divideMoneyByQuantity(total, leftover.quantity),
          total,
          components: [
            {
              skuId: leftover.skuId,
              referencePackItemId: null,
              quantity: leftover.quantity,
              unitPrice: divideMoneyByQuantity(total, leftover.quantity),
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
      unitPrice: roundMoney(input.subTotal),
      total: roundMoney(input.subTotal),
      components: input.skus.map((sku, index) => {
        const componentTotal = allocatedTotals[index] ?? 0;
        return {
          skuId: sku.skuId,
          referencePackItemId: packItemBySkuId.get(sku.skuId)?.id ?? null,
          quantity: sku.quantity,
          unitPrice: divideMoneyByQuantity(componentTotal, sku.quantity),
          total: componentTotal,
        };
      }),
    };
  }

  private reconcileImportedPricing(
    plans: ImportedItemPlan[],
    importedSubTotal: number,
  ): ImportedItemPlan[] {
    const referenceSubTotal = fromMinorUnits(
      plans.reduce((sum, item) => sum + toMinorUnits(item.total ?? 0), 0),
    );
    const targetSubTotal = roundMoney(importedSubTotal);

    if (referenceSubTotal >= targetSubTotal || plans.length === 0) {
      return plans;
    }

    const itemWeights = plans.map((item) =>
      Number(item.total) > 0 ? Number(item.total) : Number(item.quantity),
    );
    const itemTotals = this.allocateMoney(targetSubTotal, itemWeights);

    return plans.map((item, index) => {
      const itemTotal = itemTotals[index] ?? 0;
      const componentWeights = item.components.map((component) =>
        Number(component.total) > 0
          ? Number(component.total)
          : Number(component.quantity),
      );
      const componentTotals = this.allocateMoney(
        itemTotal,
        componentWeights,
      );

      return {
        ...item,
        unitPrice: divideMoneyByQuantity(itemTotal, item.quantity),
        total: itemTotal,
        components: item.components.map((component, componentIndex) => {
          const total = componentTotals[componentIndex] ?? 0;
          return {
            ...component,
            unitPrice: divideMoneyByQuantity(total, component.quantity),
            total,
          };
        }),
      };
    });
  }

  private buildPricingWarning(input: {
    description: string;
    importedTotal: number;
    referenceSubTotal: number;
    discount: number;
    deliveryCost: number;
  }): string | null {
    const importedSubTotal = fromMinorUnits(
      Math.max(toMinorUnits(input.importedTotal) - toMinorUnits(input.deliveryCost), 0),
    );
    const referenceSubTotal = roundMoney(input.referenceSubTotal);

    if (input.discount > 0) {
      return `Se reconocio ${input.description} y se aplico un descuento comercial de S/ ${input.discount.toFixed(2)} para respetar el importe importado de S/ ${input.importedTotal.toFixed(2)}.`;
    }

    if (importedSubTotal > referenceSubTotal) {
      return `El importe importado de S/ ${input.importedTotal.toFixed(2)} supera el precio de referencia; se ajustaron los precios de venta de ${input.description}.`;
    }

    return null;
  }

  private getPackItemQuantity(
    item: { skuId: string; quantity?: number },
    match: Extract<
      Awaited<ReturnType<SaleOrderPackMatcherService['decompose']>>,
      { status: 'UNIQUE' }
    >,
  ): number {
    const itemQuantityHundredths = toMinorUnits(Number(item.quantity ?? 0));
    if (itemQuantityHundredths > 0) {
      return this.quantityFromHundredths(
        BigInt(itemQuantityHundredths) * BigInt(match.packQuantity),
      );
    }

    const compositionQuantityHundredths = toMinorUnits(Number(
      match.composition.find((component) => component.skuId === item.skuId)
        ?.quantity ?? 0,
    ));
    return fromMinorUnits(compositionQuantityHundredths);
  }

  private getPackItemReferenceTotal(
    item: {
      skuId: string;
      quantity?: number;
      price?: number;
      lineTotal?: number;
    },
    match: Extract<
      Awaited<ReturnType<SaleOrderPackMatcherService['decompose']>>,
      { status: 'UNIQUE' }
    >,
  ): number {
    const lineTotal = multiplyMoneyByQuantity(
      Number(item.lineTotal ?? 0),
      Number(match.packQuantity),
    );
    if (lineTotal > 0) return lineTotal;

    const quantity = this.getPackItemQuantity(item, match);
    const price = Number(item.price ?? 0);
    if (price > 0) return multiplyMoneyByQuantity(price, quantity);

    return quantity;
  }

  private aggregateImportedSkus(
    skus: ResolvedImportSku[],
  ): ResolvedImportSku[] {
    const bySkuId = new Map<
      string,
      { sku: ResolvedImportSku; quantityHundredths: number }
    >();

    for (const sku of skus) {
      const skuId = sku.skuId?.trim();
      const quantityHundredths = toMinorUnits(Number(sku.quantity ?? 0));
      if (!skuId || quantityHundredths <= 0) continue;

      const current = bySkuId.get(skuId);
      if (current) {
        const combinedHundredths = current.quantityHundredths + quantityHundredths;
        if (!Number.isSafeInteger(combinedHundredths)) {
          throw new BadRequestException(
            'La cantidad acumulada del producto esta fuera del rango permitido',
          );
        }
        current.quantityHundredths = combinedHundredths;
        continue;
      }

      bySkuId.set(skuId, { sku: { ...sku, skuId }, quantityHundredths });
    }

    return [...bySkuId.values()]
      .map(({ sku, quantityHundredths }) => ({
        ...sku,
        quantity: fromMinorUnits(quantityHundredths),
      }))
      .sort((left, right) => left.skuId.localeCompare(right.skuId));
  }

  private allocateMoney(total: number, weights: number[]): number[] {
    if (weights.length === 0) return [];

    const targetCents = toMinorUnits(roundMoney(total));
    const normalizedWeights = weights.map((weight) =>
      Number.isFinite(weight) && weight > 0 ? toMinorUnits(weight) : 0,
    );
    const totalWeight = normalizedWeights.reduce(
      (sum, weight) => sum + BigInt(weight),
      0n,
    );
    const effectiveWeights =
      totalWeight > 0n ? normalizedWeights : weights.map(() => 100);
    const effectiveTotalWeight = effectiveWeights.reduce(
      (sum, weight) => sum + BigInt(weight),
      0n,
    );
    const targetCentsInteger = BigInt(targetCents);
    let assignedCents = 0n;

    return effectiveWeights.map((weight, index) => {
      const cents =
        index === effectiveWeights.length - 1
          ? targetCentsInteger - assignedCents
          : (targetCentsInteger * BigInt(weight)) / effectiveTotalWeight;
      assignedCents += cents;
      return fromMinorUnits(Number(cents));
    });
  }

  private quantityFromHundredths(value: bigint): number {
    if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
      throw new BadRequestException(
        'La cantidad de componentes esta fuera del rango permitido',
      );
    }
    return fromMinorUnits(Number(value));
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
