import { DataSource } from "typeorm";
import { SupplierEntity } from "src/modules/suppliers/adapters/out/persistence/typeorm/entities/supplier.entity";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";
import { PurchaseOrderEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order.entity";
import { PurchaseOrderItemEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order-item.entity";
import { PaymentDocumentEntity } from "src/modules/payments/adapters/out/persistence/typeorm/entities/payment-document.entity";
import { CreditQuotaEntity } from "src/modules/payments/adapters/out/persistence/typeorm/entities/credit-quota.entity";
import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";
import { CurrencyType as PurchaseCurrency } from "src/modules/purchases/domain/value-objects/currency-type";
import { PaymentType } from "src/modules/payments/domain/value-objects/payment-type";
import { CurrencyType as PaymentCurrency } from "src/modules/payments/domain/value-objects/currency-type";
import { PayDocType } from "src/modules/payments/domain/value-objects/pay-doc-type";
import { AfectIgvType } from "src/modules/purchases/domain/value-objects/afect-igv-type";
import { StockItemEntity } from "src/modules/inventory/adapters/out/typeorm/entities/stock-item/stock-item.entity";
import { ProductVariantEntity } from "src/modules/catalog/adapters/out/persistence/typeorm/entities/product-variant.entity";
import { StockItemType } from "src/modules/inventory/domain/value-objects/stock-item-type";

const IGV_RATE = 0.18;
const DAY_MS = 24 * 60 * 60 * 1000;

const round2 = (value: number) => Number(value.toFixed(2));

const ensureStockItemsForVariants = async (dataSource: DataSource): Promise<void> => {
  const variantRepo = dataSource.getRepository(ProductVariantEntity);
  const stockItemRepo = dataSource.getRepository(StockItemEntity);

  const variants = await variantRepo.find({ select: ["id"] });
  if (variants.length === 0) {
    throw new Error("No hay variantes. Ejecuta seedProducts primero.");
  }

  const existingLinks = await stockItemRepo.find({ select: ["variantId"] });
  const linkedVariantIds = new Set(existingLinks.map((l) => l.variantId).filter(Boolean));

  for (const variant of variants) {
    if (linkedVariantIds.has(variant.id)) continue;
    await stockItemRepo.save(
      stockItemRepo.create({ type: StockItemType.VARIANT, isActive: true, variantId: variant.id }),
    );
  }
};

export const seedPurchaseOrders = async (dataSource: DataSource, total: number = 2000): Promise<void> => {
  const supplierRepo = dataSource.getRepository(SupplierEntity);
  const warehouseRepo = dataSource.getRepository(WarehouseEntity);
  const poRepo = dataSource.getRepository(PurchaseOrderEntity);
  const itemRepo = dataSource.getRepository(PurchaseOrderItemEntity);
  const paymentDocRepo = dataSource.getRepository(PaymentDocumentEntity);
  const creditQuotaRepo = dataSource.getRepository(CreditQuotaEntity);
  const stockItemRepo = dataSource.getRepository(StockItemEntity);

  const suppliers = await supplierRepo.find();
  const warehouses = await warehouseRepo.find();
  if (suppliers.length === 0) throw new Error("No hay proveedores. Ejecuta seedSuppliers primero.");
  if (warehouses.length === 0) throw new Error("No hay almacenes. Ejecuta seedWarehouses primero.");

  await ensureStockItemsForVariants(dataSource);
  const stockItems = await stockItemRepo.find();
  if (stockItems.length === 0) throw new Error("No hay stock items.");

  const docType = VoucherDocType.FACTURA;
  const serie = "F001";
  const maxRow = await poRepo
    .createQueryBuilder("po")
    .select("MAX(po.correlative)", "max")
    .where("po.documentType = :docType AND po.serie = :serie", { docType, serie })
    .getRawOne();
  let correlative = Number(maxRow?.max ?? 0);

  const half = Math.floor(total / 2);
  for (let i = 1; i <= total; i++) {
    const isCredit = i <= half;
    const supplier = suppliers[i % suppliers.length];
    const warehouse = warehouses[i % warehouses.length];

    const dateIssue = new Date(Date.now() - (i % 10) * DAY_MS);
    const expectedAt = new Date(Date.now() + ((i % 10) + 1) * DAY_MS);
    const dateExpiration = isCredit ? new Date(dateIssue.getTime() + 60 * DAY_MS) : null;

    const itemsCount = 2 + (i % 3);
    const items = [];
    let totalTaxed = 0;
    let totalIgv = 0;

    for (let j = 0; j < itemsCount; j++) {
      const stockItem = stockItems[(i + j) % stockItems.length];
      const quantity = 1 + ((i + j) % 20);
      const unitValue = round2(5 + ((i * 7 + j * 13) % 95));
      const baseWithoutIgv = round2(unitValue * quantity);
      const amountIgv = round2(baseWithoutIgv * IGV_RATE);
      const unitPrice = round2(unitValue * (1 + IGV_RATE));

      totalTaxed += baseWithoutIgv;
      totalIgv += amountIgv;

      items.push({
        stockItemId: stockItem.id,
        unitBase: "NIU",
        equivalencia: "1",
        factor: 1,
        afectType: AfectIgvType.TAXED,
        quantity,
        porcentageIgv: 18,
        baseWithoutIgv,
        amountIgv,
        unitValue,
        unitPrice,
        purchaseValue: baseWithoutIgv,
      });
    }

    totalTaxed = round2(totalTaxed);
    totalIgv = round2(totalIgv);
    const purchaseValue = totalTaxed;
    const totalAmount = round2(totalTaxed + totalIgv);

    correlative += 1;
    const po = await poRepo.save(
      poRepo.create({
        supplierId: supplier.id,
        warehouseId: warehouse.id,
        documentType: docType,
        serie,
        correlative,
        currency: PurchaseCurrency.PEN,
        paymentForm: isCredit ? PaymentFormType.CREDITO : PaymentFormType.CONTADO,
        creditDays: isCredit ? 60 : 0,
        numQuotas: isCredit ? 3 : 0,
        totalTaxed,
        totalExempted: 0,
        totalIgv,
        purchaseValue,
        total: totalAmount,
        note: isCredit ? "Compra a credito" : "Compra al contado",
        status: PurchaseOrderStatus.DRAFT,
        isActive: true,
        expectedAt,
        dateIssue,
        dateExpiration,
      }),
    );

    for (const item of items) {
      await itemRepo.save(
        itemRepo.create({
          poId: po.id,
          stockItemId: item.stockItemId,
          unitBase: item.unitBase,
          equivalencia: item.equivalencia,
          factor: item.factor,
          afectType: item.afectType,
          quantity: item.quantity,
          porcentageIgv: item.porcentageIgv,
          baseWithoutIgv: item.baseWithoutIgv,
          amountIgv: item.amountIgv,
          unitValue: item.unitValue,
          unitPrice: item.unitPrice,
          purchaseValue: item.purchaseValue,
        }),
      );
    }

    if (!isCredit) {
      await paymentDocRepo.save(
        paymentDocRepo.create({
          method: PaymentType.EFECTIVO,
          date: dateIssue,
          operationNumber: `OP-${correlative}`,
          currency: PaymentCurrency.PEN,
          amount: totalAmount,
          note: "Pago total",
          fromDocumentType: PayDocType.PURCHASE,
          poId: po.id,
        }),
      );
    } else {
      const numQuotas = 3;
      const quotaAmount = round2(totalAmount / numQuotas);
      for (let q = 1; q <= numQuotas; q++) {
        const expirationDate = new Date(dateIssue.getTime() + q * 30 * DAY_MS);
        const quota = await creditQuotaRepo.save(
          creditQuotaRepo.create({
            number: q,
            expirationDate,
            totalToPay: q === numQuotas ? round2(totalAmount - quotaAmount * (numQuotas - 1)) : quotaAmount,
            totalPaid: 0,
            paymentDate: null,
            fromDocumentType: PayDocType.PURCHASE,
            poId: po.id,
          }),
        );
      }
    }

    if (i % 100 === 0) {
      console.log(`Compras creadas: ${i}/${total}`);
    }
  }
};
