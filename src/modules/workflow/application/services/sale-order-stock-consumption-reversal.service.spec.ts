import { ProductCatalogDocumentSerie } from "src/modules/product-catalog/domain/entities/document-serie";
import { ProductCatalogInventoryDocument } from "src/modules/product-catalog/domain/entities/inventory-document";
import { ProductCatalogInventoryDocumentItem } from "src/modules/product-catalog/domain/entities/inventory-document-item";
import { SaleOrder } from "src/modules/sale-orders/domain/entities/sale-order";
import { Direction } from "src/shared/domain/value-objects/direction";
import { DocStatus } from "src/shared/domain/value-objects/doc-status";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ReferenceType } from "src/shared/domain/value-objects/reference-type";
import { SaleOrderStockConsumptionReversalService } from "./sale-order-stock-consumption-reversal.service";

describe("SaleOrderStockConsumptionReversalService", () => {
  const tx = { manager: {} } as any;
  const order = new SaleOrder(
    "order-1",
    "PE",
    10,
    "warehouse-1",
    "client-1",
    null,
    null,
    null,
    null,
    null,
    0,
    0,
    0,
    0,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    "user-1",
    "workflow-1",
    "state-delivered",
    true,
    null,
    new Date("2026-08-20T00:00:00.000Z"),
    null,
  );
  const consumedDocument = new ProductCatalogInventoryDocument(
    "out-1",
    DocType.OUT,
    null,
    DocStatus.POSTED,
    "serie-out",
    5,
    "warehouse-1",
    null,
    "order-1",
    ReferenceType.SALE_ORDER,
    "Consumo de pedido",
    "user-1",
    "user-1",
    new Date("2026-08-20T00:00:00.000Z"),
  );

  function buildService(
    existingReversals: ProductCatalogInventoryDocument[] = [],
    consumedDocuments: ProductCatalogInventoryDocument[] = [consumedDocument],
  ) {
    const documentRepo = {
      findByReference: jest
        .fn()
        .mockResolvedValueOnce(consumedDocuments)
        .mockResolvedValueOnce(existingReversals),
      listItems: jest.fn().mockResolvedValue([
        new ProductCatalogInventoryDocumentItem(
          "out-item-1",
          "out-1",
          "stock-1",
          2,
          0,
          null,
          null,
          12,
        ),
      ]),
      create: jest.fn().mockImplementation(async (document: ProductCatalogInventoryDocument) =>
        new ProductCatalogInventoryDocument(
          "in-1",
          document.docType,
          document.productType,
          document.status,
          document.serieId,
          document.correlative,
          document.fromWarehouseId,
          document.toWarehouseId,
          document.referenceId,
          document.referenceType,
          document.note,
          document.createdBy,
          document.postedBy,
          document.postedAt,
        ),
      ),
      addItem: jest.fn().mockImplementation(async (item: ProductCatalogInventoryDocumentItem) =>
        new ProductCatalogInventoryDocumentItem(
          "in-item-1",
          item.docId,
          item.stockItemId,
          item.quantity,
          item.wasteQty,
          item.fromLocationId,
          item.toLocationId,
          item.unitCost,
        ),
      ),
      markPosted: jest.fn().mockResolvedValue(undefined),
    };
    const serieRepo = {
      findActiveFor: jest.fn().mockResolvedValue([
        ProductCatalogDocumentSerie.create({
          id: "serie-in",
          code: "IN",
          name: "Ingresos",
          docType: DocType.IN,
          warehouseId: "warehouse-1",
        }),
      ]),
      reserveNextNumber: jest.fn().mockResolvedValue(7),
    };
    const inventoryRepo = {
      incrementOnHand: jest.fn().mockResolvedValue({}),
      incrementReserved: jest.fn().mockResolvedValue({}),
    };
    const ledgerRepo = { append: jest.fn().mockResolvedValue(undefined) };
    const inventoryLock = { lockSnapshots: jest.fn().mockResolvedValue(undefined) };
    const saleOrderRepo = {
      setReserveBool: jest.fn().mockResolvedValue(undefined),
      markStockReverted: jest.fn().mockResolvedValue(undefined),
    };
    const service = new SaleOrderStockConsumptionReversalService(
      documentRepo as any,
      serieRepo as any,
      inventoryRepo as any,
      ledgerRepo as any,
      inventoryLock as any,
      saleOrderRepo as any,
    );

    return {
      service,
      documentRepo,
      inventoryRepo,
      ledgerRepo,
      inventoryLock,
      saleOrderRepo,
    };
  }

  it("posts a compensating entry and reserves the restored stock", async () => {
    const dependencies = buildService();

    await expect(
      dependencies.service.restoreAndReserve(order, "user-2", tx),
    ).resolves.toBe(true);

    expect(dependencies.inventoryLock.lockSnapshots).toHaveBeenCalledWith(
      [{ warehouseId: "warehouse-1", stockItemId: "stock-1" }],
      tx,
    );
    expect(dependencies.inventoryRepo.incrementOnHand).toHaveBeenCalledWith(
      {
        warehouseId: "warehouse-1",
        stockItemId: "stock-1",
        locationId: null,
        delta: 2,
      },
      tx,
    );
    expect(dependencies.inventoryRepo.incrementReserved).toHaveBeenCalledWith(
      {
        warehouseId: "warehouse-1",
        stockItemId: "stock-1",
        locationId: null,
        delta: 2,
      },
      tx,
    );
    expect(dependencies.ledgerRepo.append).toHaveBeenCalledWith(
      [expect.objectContaining({ direction: Direction.IN, quantity: 2 })],
      tx,
    );
    expect(dependencies.documentRepo.markPosted).toHaveBeenCalledWith(
      expect.objectContaining({ docId: "in-1", postedBy: "user-2" }),
      tx,
    );
    expect(dependencies.saleOrderRepo.setReserveBool).toHaveBeenCalledWith(
      { saleOrderId: "order-1", reserveBool: true },
      tx,
    );
    expect(dependencies.saleOrderRepo.markStockReverted).toHaveBeenCalledWith(
      "order-1",
      tx,
    );
  });

  it('posts a compensating entry without reserving stock when the target state is before reservation', async () => {
    const dependencies = buildService();

    await expect(
      dependencies.service.restoreAndRelease(order, 'user-2', tx),
    ).resolves.toBe(true);

    expect(dependencies.inventoryRepo.incrementOnHand).toHaveBeenCalledWith(
      {
        warehouseId: 'warehouse-1',
        stockItemId: 'stock-1',
        locationId: null,
        delta: 2,
      },
      tx,
    );
    expect(
      dependencies.inventoryRepo.incrementReserved,
    ).not.toHaveBeenCalled();
    expect(dependencies.saleOrderRepo.setReserveBool).toHaveBeenCalledWith(
      { saleOrderId: 'order-1', reserveBool: false },
      tx,
    );
  });

  it("does not duplicate an existing compensating entry", async () => {
    const existing = new ProductCatalogInventoryDocument(
      "in-existing",
      DocType.IN,
      null,
      DocStatus.POSTED,
      "serie-in",
      6,
      null,
      "warehouse-1",
      "order-1",
      ReferenceType.SALE_ORDER,
      "Reversión del consumo out-1 por corrección del total",
      "user-2",
      "user-2",
      new Date("2026-08-21T00:00:00.000Z"),
    );
    const dependencies = buildService([existing]);

    await expect(
      dependencies.service.restoreAndReserve(order, "user-2", tx),
    ).resolves.toBe(false);

    expect(dependencies.documentRepo.create).not.toHaveBeenCalled();
    expect(dependencies.inventoryRepo.incrementOnHand).not.toHaveBeenCalled();
  });

  it('reverses a newer consumption even when an older one was already reversed', async () => {
    const existing = new ProductCatalogInventoryDocument(
      'in-existing',
      DocType.IN,
      null,
      DocStatus.POSTED,
      'serie-in',
      6,
      null,
      'warehouse-1',
      'order-1',
      ReferenceType.SALE_ORDER,
      'Reversión del consumo out-1 por corrección',
      'user-2',
      'user-2',
      new Date('2026-08-21T00:00:00.000Z'),
    );
    const newerConsumption = new ProductCatalogInventoryDocument(
      'out-2',
      DocType.OUT,
      null,
      DocStatus.POSTED,
      'serie-out',
      6,
      'warehouse-1',
      null,
      'order-1',
      ReferenceType.SALE_ORDER,
      'Consumo corregido',
      'user-1',
      'user-1',
      new Date('2026-08-22T00:00:00.000Z'),
    );
    const dependencies = buildService(
      [existing],
      [consumedDocument, newerConsumption],
    );

    await expect(
      dependencies.service.restoreAndReserve(order, 'user-2', tx),
    ).resolves.toBe(true);

    expect(dependencies.documentRepo.listItems).toHaveBeenCalledWith(
      'out-2',
      tx,
    );
  });
});
