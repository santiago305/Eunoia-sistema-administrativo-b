import { BadRequestException } from "@nestjs/common";
import { ProductCatalogInventoryBalance } from "../../domain/entities/inventory-balance";
import { ProductCatalogInventoryDocument } from "../../domain/entities/inventory-document";
import { ProductCatalogInventoryDocumentItem } from "../../domain/entities/inventory-document-item";
import { ProductCatalogProductType } from "../../domain/value-objects/product-type";
import { DocStatus } from "src/shared/domain/value-objects/doc-status";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { Direction } from "src/shared/domain/value-objects/direction";
import { ProcessProductCatalogInventoryDocument } from "./process-inventory-document.usecase";
import { ReceiveProductCatalogInventoryTransfer } from "./receive-inventory-transfer.usecase";

const tx = {} as any;
const stockItemId = "11111111-1111-4111-8111-111111111111";
const documentId = "22222222-2222-4222-8222-222222222222";
const fromWarehouseId = "33333333-3333-4333-8333-333333333333";
const toWarehouseId = "44444444-4444-4444-8444-444444444444";

const buildDocument = (status: DocStatus) =>
  new ProductCatalogInventoryDocument(
    documentId,
    DocType.TRANSFER,
    ProductCatalogProductType.PRODUCT,
    status,
    "55555555-5555-4555-8555-555555555555",
    1,
    fromWarehouseId,
    toWarehouseId,
    null,
    null,
    null,
    "66666666-6666-4666-8666-666666666666",
    null,
    null,
    new Date("2026-08-30T12:00:00.000Z"),
    null,
    "2026-08-30",
    "2026-09-01",
  );

const item = new ProductCatalogInventoryDocumentItem(
  "77777777-7777-4777-8777-777777777777",
  documentId,
  stockItemId,
  5,
  0,
  null,
  null,
  10,
);

describe("inventory transfer lifecycle", () => {
  it("dispatches stock only from the source warehouse", async () => {
    const documentRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue(buildDocument(DocStatus.DRAFT)),
      listItems: jest.fn().mockResolvedValue([item]),
      markInTransit: jest.fn().mockResolvedValue(undefined),
      markPosted: jest.fn().mockResolvedValue(undefined),
    };
    const inventoryRepo = {
      listByStockItemId: jest.fn().mockResolvedValue([
        new ProductCatalogInventoryBalance(fromWarehouseId, stockItemId, null, 12, 2, 10),
        new ProductCatalogInventoryBalance(toWarehouseId, stockItemId, null, 3, 0, 3),
      ]),
      upsert: jest.fn().mockImplementation(async (balance) => balance),
    };
    const ledgerRepo = { append: jest.fn().mockResolvedValue(undefined) };
    const inventoryLock = { lockSnapshots: jest.fn().mockResolvedValue(undefined) };
    const inventoryRealtime = { emitStockUpdated: jest.fn() };
    const uow = { runInTransaction: jest.fn((callback) => callback(tx)) };

    const usecase = new ProcessProductCatalogInventoryDocument(
      uow as any,
      documentRepo as any,
      inventoryRepo as any,
      ledgerRepo as any,
      inventoryLock as any,
      inventoryRealtime as any,
    );

    await usecase.execute({ docId: documentId, postedBy: "user-dispatch" });

    expect(inventoryRepo.upsert).toHaveBeenCalledTimes(1);
    expect(inventoryRepo.upsert.mock.calls[0][0]).toEqual(
      expect.objectContaining({ warehouseId: fromWarehouseId, onHand: 7 }),
    );
    expect(ledgerRepo.append.mock.calls[0][0]).toEqual([
      expect.objectContaining({ warehouseId: fromWarehouseId, direction: Direction.OUT, quantity: 5 }),
    ]);
    expect(documentRepo.markInTransit).toHaveBeenCalledWith(
      expect.objectContaining({ docId: documentId, dispatchedBy: "user-dispatch" }),
      tx,
    );
    expect(documentRepo.markPosted).not.toHaveBeenCalled();
  });

  it("receives stock only into the destination warehouse", async () => {
    const documentRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue(buildDocument(DocStatus.IN_TRANSIT)),
      listItems: jest.fn().mockResolvedValue([item]),
      markReceived: jest.fn().mockResolvedValue(undefined),
    };
    const inventoryRepo = {
      getSnapshot: jest.fn().mockResolvedValue(
        new ProductCatalogInventoryBalance(toWarehouseId, stockItemId, null, 3, 1, 2),
      ),
      upsert: jest.fn().mockImplementation(async (balance) => balance),
    };
    const ledgerRepo = { append: jest.fn().mockResolvedValue(undefined) };
    const inventoryLock = { lockSnapshots: jest.fn().mockResolvedValue(undefined) };
    const inventoryRealtime = { emitStockUpdated: jest.fn() };
    const uow = { runInTransaction: jest.fn((callback) => callback(tx)) };

    const usecase = new ReceiveProductCatalogInventoryTransfer(
      uow as any,
      documentRepo as any,
      inventoryRepo as any,
      ledgerRepo as any,
      inventoryLock as any,
      inventoryRealtime as any,
    );

    await usecase.execute({ docId: documentId, receivedBy: "user-receive" });

    expect(inventoryRepo.upsert).toHaveBeenCalledTimes(1);
    expect(inventoryRepo.upsert.mock.calls[0][0]).toEqual(
      expect.objectContaining({ warehouseId: toWarehouseId, onHand: 8, available: 7 }),
    );
    expect(ledgerRepo.append.mock.calls[0][0]).toEqual([
      expect.objectContaining({ warehouseId: toWarehouseId, direction: Direction.IN, quantity: 5 }),
    ]);
    expect(documentRepo.markReceived).toHaveBeenCalledWith(
      expect.objectContaining({ docId: documentId, receivedBy: "user-receive" }),
      tx,
    );
  });

  it("does not receive a transfer that has not been dispatched", async () => {
    const documentRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue(buildDocument(DocStatus.DRAFT)),
    };
    const usecase = new ReceiveProductCatalogInventoryTransfer(
      { runInTransaction: (callback: (context: unknown) => unknown) => callback(tx) } as any,
      documentRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await expect(usecase.execute({ docId: documentId, receivedBy: "user-receive" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
