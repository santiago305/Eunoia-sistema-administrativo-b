import { SaleOrderStockConsumptionService } from "./sale-order-stock-consumption.service";

describe("SaleOrderStockConsumptionService", () => {
  const tx = {} as any;
  const order = { id: "order-1", warehouseId: "warehouse-1", createdBy: "user-1" } as any;
  const requirements = [
    { stockItemId: "stock-1", quantity: 3 },
    { stockItemId: "stock-2", quantity: 2 },
  ];

  function setup(existingDocuments: any[] = []) {
    const documents = {
      findByReference: jest.fn().mockResolvedValue(existingDocuments),
      create: jest.fn().mockResolvedValue({ id: "doc-1" }),
      addItem: jest
        .fn()
        .mockResolvedValueOnce({ id: "item-1" })
        .mockResolvedValueOnce({ id: "item-2" }),
      markPosted: jest.fn().mockResolvedValue(undefined),
    };
    const series = {
      findActiveFor: jest.fn().mockResolvedValue([{ id: "out-serie" }]),
      reserveNextNumber: jest.fn().mockResolvedValue(11),
    };
    const inventory = {
      incrementReserved: jest.fn().mockResolvedValue(undefined),
      incrementOnHand: jest.fn().mockResolvedValue(undefined),
    };
    const ledger = { append: jest.fn().mockResolvedValue(undefined) };

    return {
      service: new SaleOrderStockConsumptionService(
        documents as any,
        series as any,
        inventory as any,
        ledger as any,
      ),
      documents,
      series,
      inventory,
      ledger,
    };
  }

  it("posts one OUT document with all consolidated stock requirements", async () => {
    const { service, documents, inventory, ledger } = setup();

    await service.consume(order, requirements, tx);

    expect(documents.create).toHaveBeenCalledTimes(1);
    expect(documents.addItem).toHaveBeenCalledTimes(2);
    expect(inventory.incrementReserved).toHaveBeenCalledTimes(2);
    expect(inventory.incrementOnHand).toHaveBeenCalledTimes(2);
    expect(ledger.append).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ docId: "doc-1", docItemId: "item-1", stockItemId: "stock-1", quantity: 3 }),
        expect.objectContaining({ docId: "doc-1", docItemId: "item-2", stockItemId: "stock-2", quantity: 2 }),
      ]),
      tx,
    );
    expect(documents.markPosted).toHaveBeenCalledWith(
      { docId: "doc-1", postedBy: "user-1", postedAt: expect.any(Date) },
      tx,
    );
  });

  it("does not consume stock twice when the order already has a posted OUT document", async () => {
    const { service, documents, inventory, ledger } = setup([{ id: "existing-doc", status: "POSTED" }]);

    await service.consume(order, requirements, tx);

    expect(documents.create).not.toHaveBeenCalled();
    expect(inventory.incrementReserved).not.toHaveBeenCalled();
    expect(ledger.append).not.toHaveBeenCalled();
  });
});
