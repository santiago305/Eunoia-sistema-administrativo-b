import { BadRequestException, Inject } from "@nestjs/common";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PURCHASE_ORDER_ITEM, PurchaseOrderItemRepository } from "src/modules/purchases/domain/ports/purchase-order-item.port.repository";
import { PAYMENT_DOCUMENT_REPOSITORY, PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";
import { CREDIT_QUOTA_REPOSITORY, CreditQuotaRepository } from "src/modules/payments/domain/ports/credit-quota.repository";
import { GetPurchaseOrderInput } from "../../dtos/purchase-order/input/get-by-id.input";
import { PurchaseOrderDetailOutput } from "../../dtos/purchase-order/output/purchase-order-detail.output";
import { PaymentOutput } from "src/modules/payments/application/dtos/payment/output/payment.output";
import { PurchaseOrderItemOutput } from "../../dtos/purchase-order-item/output/purchase-order-item.output";
import { CreditQuotaOutput } from "src/modules/payments/application/dtos/credit-quota/output/credit-quota.output";
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from "src/modules/catalog/domain/ports/product-variant.repository";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalog/domain/ports/product.repository";
import { ProductId } from "src/modules/catalog/domain/value-object/product-id.vo";
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from "src/modules/inventory/domain/ports/stock-item/stock-item.repository.port";
import { StockItemType } from "src/modules/inventory/domain/value-objects/stock-item-type";
import { toProductOutput, toVariantOutput } from "src/modules/production/application/utils/productVariant";

export class GetPurchaseOrderUsecase {
  constructor(
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
    @Inject(PURCHASE_ORDER_ITEM)
    private readonly itemRepo: PurchaseOrderItemRepository,
    @Inject(PAYMENT_DOCUMENT_REPOSITORY)
    private readonly paymentDocRepo: PaymentDocumentRepository,
    @Inject(CREDIT_QUOTA_REPOSITORY)
    private readonly creditQuotaRepo: CreditQuotaRepository,
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
    @Inject(PRODUCT_VARIANT_REPOSITORY) private readonly variantRepo: ProductVariantRepository,
  ) {}

  async execute(input: GetPurchaseOrderInput): Promise<PurchaseOrderDetailOutput> {
    const order = await this.purchaseRepo.findById(input.poId);
    if (!order) {
      throw new BadRequestException({ type: "error", message: "Orden de compra no encontrada" });
    }

    const [items, payments, quotas] = await Promise.all([
      this.itemRepo.getByPurchaseId(order.poId),
      this.paymentDocRepo.findByPoId(order.poId),
      this.creditQuotaRepo.findByPoId(order.poId),
    ]);

    const itemOutputs: PurchaseOrderItemOutput[] = await Promise.all(
      items.map(async (row) => {
        let stockItem = await this.stockItemRepo.findByProductIdOrVariantId(row.stockItemId);
        if (!stockItem) {
          throw new BadRequestException({ type: "error", message: "Item de stock no encontrado" });
        }

        let stockItemOutput: PurchaseOrderItemOutput["stockItem"] = null;

        if (stockItem.type === StockItemType.PRODUCT) {
          if (!stockItem.productId) {
            throw new BadRequestException({ type: "error", message: "Producto no encontrado" });
          }
          const productInfo = await this.productRepo.findByIdWithUnitInfo(ProductId.create(stockItem.productId));
          if (!productInfo) {
            throw new BadRequestException({ type: "error", message: "Producto no encontrado" });
          }
          stockItemOutput = {
            type: StockItemType.PRODUCT,
            stockItemId:productInfo.product.getId().value,
            product: toProductOutput(productInfo.product, {
              baseUnitName: productInfo.baseUnitName,
              baseUnitCode: productInfo.baseUnitCode,
            }),
          };
        }
        
        if (stockItem.type === StockItemType.VARIANT) {
          if (!stockItem.variantId) {
            throw new BadRequestException({ type: "error", message: "Variante no encontrada" });
          }
          const variantInfo = await this.variantRepo.findByIdWithProductInfo(stockItem.variantId);
          if (!variantInfo?.variant) {
            throw new BadRequestException({ type: "error", message: "Variante no encontrada" });
          }
          stockItemOutput = {
            type: StockItemType.VARIANT,
            stockItemId: variantInfo.variant.getId(),
            variant: toVariantOutput(variantInfo.variant, {
              productName: variantInfo.productName,
              productDescription: variantInfo.productDescription,
              baseUnitId: variantInfo.baseUnitId,
              unitCode: variantInfo.unitCode,
              unitName: variantInfo.unitName,
            }),
          };
        }

        return {
          poItemId: row.poItemId,
          poId: row.poId,
          stockItemId: row.stockItemId,
          stockItem: stockItemOutput,
          unitBase: row.unitBase,
          equivalence: row.equivalence,
          factor: row.factor,
          afectType: row.afectType,
          quantity: row.quantity,
          porcentageIgv: row.porcentageIgv.getAmount(),
          baseWithoutIgv: row.baseWithoutIgv.getAmount(),
          amountIgv: row.amountIgv.getAmount(),
          unitValue: row.unitValue.getAmount(),
          unitPrice: row.unitPrice.getAmount(),
          purchaseValue: row.purchaseValue.getAmount(),
        };
      }),
    );

    const paymentOutputs: PaymentOutput[] = payments.map((row) => ({
      payDocId: row.payDocId,
      method: row.method,
      date: row.date,
      operationNumber: row.operationNumber ?? null,
      currency: row.currency,
      amount: row.amount,
      note: row.note ?? null,
      fromDocumentType: row.fromDocumentType,
      poId: row.poId ?? "",
      quotaId: row.quotaId ?? null,
    }));

    const quotaOutputs: CreditQuotaOutput[] = quotas.map((row) => ({
      quotaId: row.quotaId,
      number: row.number,
      expirationDate: row.expirationDate,
      paymentDate: row.paymentDate,
      totalToPay: row.totalToPay,
      totalPaid: row.totalPaid,
      createdAt: row.createdAt,
    }));

    const totalPaid = paymentOutputs.reduce((sum, p) => sum + (p.amount ?? 0), 0);
    const totalPurchase = order.total?.getAmount() ?? 0;

    return {
      poId: order.poId,
      supplierId: order.supplierId,
      warehouseId: order.warehouseId,
      documentType: order.documentType,
      serie: order.serie,
      correlative: order.correlative,
      currency: order.currency,
      paymentForm: order.paymentForm,
      creditDays: order.creditDays,
      numQuotas: order.numQuotas,
      totalTaxed: order.totalTaxed.getAmount(),
      totalExempted: order.totalExempted.getAmount(),
      totalIgv: order.totalIgv.getAmount(),
      purchaseValue: order.purchaseValue.getAmount(),
      total: totalPurchase,
      totalPaid,
      totalToPay: totalPurchase - totalPaid,
      items: itemOutputs,
      quotas: quotaOutputs,
      payments: paymentOutputs,
      note: order.note,
      status: order.status,
      isActive: order.isActive,
      expectedAt: order.expectedAt,
      dateIssue: order.dateIssue,
      dateExpiration: order.dateExpiration,
      createdAt: order.createdAt,
    };
  }
}
