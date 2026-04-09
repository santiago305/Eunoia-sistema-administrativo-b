import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PURCHASE_ORDER_ITEM, PurchaseOrderItemRepository } from "src/modules/purchases/domain/ports/purchase-order-item.port.repository";
import { PAYMENT_DOCUMENT_REPOSITORY, PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";
import { CREDIT_QUOTA_REPOSITORY, CreditQuotaRepository } from "src/modules/payments/domain/ports/credit-quota.repository";
import { GetPurchaseOrderInput } from "../../dtos/purchase-order/input/get-by-id.input";
import { PurchaseOrderDetailOutput } from "../../dtos/purchase-order/output/purchase-order-detail.output";
import { PaymentOutput } from "src/modules/payments/application/dtos/payment/output/payment.output";
import { PurchaseOrderItemOutput } from "../../dtos/purchase-order-item/output/purchase-order-item.output";
import { CreditQuotaOutput } from "src/modules/payments/application/dtos/credit-quota/output/credit-quota.output";
import { StockItemType } from "src/shared/domain/value-objects/stock-item-type";
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from "src/modules/product-catalog/compat/ports/stock-item.repository.port";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PurchaseOrderOutputMapper } from "../../mappers/purchase-order-output.mapper";
import { PurchaseOrderNotFoundApplicationError } from "../../errors/purchase-order-not-found.error";
import { PRODUCT_CATALOG_PRODUCT_REPOSITORY, ProductCatalogProductRepository } from "src/modules/product-catalog/domain/ports/product.repository";
import { PRODUCT_CATALOG_SKU_REPOSITORY, ProductCatalogSkuRepository } from "src/modules/product-catalog/domain/ports/sku.repository";
import { PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY, ProductCatalogStockItemRepository } from "src/modules/product-catalog/domain/ports/stock-item.repository";

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
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly productCatalogStockItemRepo: ProductCatalogStockItemRepository,
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly productCatalogSkuRepo: ProductCatalogSkuRepository,
    @Inject(PRODUCT_CATALOG_PRODUCT_REPOSITORY)
    private readonly productCatalogProductRepo: ProductCatalogProductRepository,
  ) {}

  async execute(input: GetPurchaseOrderInput): Promise<PurchaseOrderDetailOutput> {
    const order = await this.purchaseRepo.findById(input.poId);
    if (!order) {
      throw new NotFoundException(new PurchaseOrderNotFoundApplicationError().message);
    }

    const [items, payments, quotas] = await Promise.all([
      this.itemRepo.getByPurchaseId(order.poId, order.currency ?? CurrencyType.PEN),
      this.paymentDocRepo.findByPoId(order.poId),
      this.creditQuotaRepo.findByPoId(order.poId),
    ]);

    const itemOutputs: PurchaseOrderItemOutput[] = await Promise.all(
      items.map(async (row) => {
        let stockItem = await this.stockItemRepo.findById(row.stockItemId);
        if (!stockItem) {
          stockItem = await this.stockItemRepo.findByProductOrStockItemId(row.stockItemId);
        }
        const skuStockItem = stockItem ? null : await this.productCatalogStockItemRepo.findById(row.stockItemId);
        if (!stockItem && !skuStockItem) throw new BadRequestException("Item de stock no encontrado");

        let stockItemOutput: PurchaseOrderItemOutput["stockItem"] = null;

        if (stockItem?.type === StockItemType.PRODUCT) {
          if (!stockItem.productId) {
            throw new BadRequestException("Producto no encontrado");
          }
          stockItemOutput = {
            type: StockItemType.PRODUCT,
            stockItemId: stockItem.stockItemId!,
            product: {
              id: stockItem.productId,
              name: null,
              sku: null,
            },
          };
        }
        
        if (skuStockItem) {
          const sku = await this.productCatalogSkuRepo.findById(skuStockItem.skuId);
          if (!sku) throw new BadRequestException("Sku no encontrado");
          const product = await this.productCatalogProductRepo.findById(sku.sku.productId);
          if (!product) throw new BadRequestException("Familia del sku no encontrada");
          stockItemOutput = {
            type: "SKU",
            stockItemId: skuStockItem.id!,
            sku: {
              id: sku.sku.id!,
              productId: sku.sku.productId,
              productName: product.name,
              name: sku.sku.name,
              backendSku: sku.sku.backendSku,
              customSku: sku.sku.customSku,
              barcode: sku.sku.barcode,
              attributes: sku.attributes,
              isActive: sku.sku.isActive,
            },
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

    const paymentOutputs: PaymentOutput[] = payments.map((row) =>
      PurchaseOrderOutputMapper.toPaymentOutput(row),
    );

    const quotaOutputs: CreditQuotaOutput[] = quotas.map((row) =>
      PurchaseOrderOutputMapper.toQuotaOutput(row),
    );

    return PurchaseOrderOutputMapper.toDetailOutput({
      order,
      items: itemOutputs,
      payments: paymentOutputs,
      quotas: quotaOutputs,
    });
  }
}



