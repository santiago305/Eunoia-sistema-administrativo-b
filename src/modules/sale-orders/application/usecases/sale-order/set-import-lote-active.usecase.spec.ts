import { SetImportLoteActiveUsecase } from "./set-import-lote-active.usecase";

describe("SetImportLoteActiveUsecase", () => {
  it("updates lote, matching sale orders, and writes audit in one transaction", async () => {
    const tx = { id: "tx" };
    const uow = { runInTransaction: jest.fn((work) => work(tx)) };
    const saleOrderRepo = { setActiveByLote: jest.fn().mockResolvedValue(["so-1", "so-2"]) };
    const loteRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue({
        id: "lote-id",
        lote: 3,
        createdAt: new Date("2026-07-30T10:00:00.000Z"),
        createdBy: "user-1",
        createdByName: "Admin",
        createdByEmail: "admin@example.test",
        isActive: true,
      }),
      setActive: jest.fn().mockResolvedValue({
        id: "lote-id",
        lote: 3,
        createdAt: new Date("2026-07-30T10:00:00.000Z"),
        createdBy: "user-1",
        createdByName: "Admin",
        createdByEmail: "admin@example.test",
        isActive: false,
      }),
      createAudit: jest.fn().mockResolvedValue(undefined),
    };

    const usecase = new SetImportLoteActiveUsecase(uow as any, saleOrderRepo as any, loteRepo as any);

    const result = await usecase.execute({ loteId: "lote-id", isActive: false, executedBy: "user-2" });

    expect(result.saleOrderIds).toEqual(["so-1", "so-2"]);
    expect(result.lote.createdBy).toEqual({
      id: "user-1",
      name: "Admin",
      email: "admin@example.test",
    });
    expect(loteRepo.setActive).toHaveBeenCalledWith({ id: "lote-id", isActive: false }, tx);
    expect(saleOrderRepo.setActiveByLote).toHaveBeenCalledWith({ lote: 3, isActive: false }, tx);
    expect(loteRepo.createAudit).toHaveBeenCalledWith({
      loteId: "lote-id",
      executedBy: "user-2",
      actionExecution: "delete",
    }, tx);
  });
});
