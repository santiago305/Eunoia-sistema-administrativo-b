import { SaleOrderImportLoteTypeormRepository } from "./sale-order-import-lote.typeorm.repo";

describe("SaleOrderImportLoteTypeormRepository", () => {
  it("reserves next lote using advisory lock and latest lote", async () => {
    const manager = {
      query: jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce([{ lote: 7 }]),
    };
    const repo = new SaleOrderImportLoteTypeormRepository({ manager } as any);

    const next = await repo.reserveNextLote({ manager } as any);

    expect(next).toBe(8);
    expect(manager.query).toHaveBeenNthCalledWith(
      1,
      "SELECT pg_advisory_xact_lock(hashtext('sale_order_import_lotes'))",
    );
  });

  it("finds a lote for update without loading nullable relations", async () => {
    const findOne = jest.fn().mockResolvedValue({
      id: "lote-1",
      lote: 3,
      createdAt: new Date("2026-07-30T00:00:00.000Z"),
      createdBy: "user-1",
      isActive: true,
    });
    const manager = {
      getRepository: jest.fn().mockReturnValue({ findOne }),
    };
    const repo = new SaleOrderImportLoteTypeormRepository({ manager } as any);

    await repo.findByIdForUpdate("lote-1", { manager } as any);

    expect(findOne).toHaveBeenCalledWith({
      where: { id: "lote-1" },
      lock: { mode: "pessimistic_write" },
    });
  });

  it("maps creator email when listing lotes", async () => {
    const find = jest.fn().mockResolvedValue([
      {
        id: "lote-1",
        lote: 3,
        createdAt: new Date("2026-07-30T00:00:00.000Z"),
        createdBy: "user-1",
        creator: { name: "Admin", email: "admin@example.test" },
        isActive: true,
      },
    ]);
    const manager = {
      getRepository: jest.fn().mockReturnValue({ find }),
    };
    const repo = new SaleOrderImportLoteTypeormRepository({ manager } as any);

    await expect(repo.list()).resolves.toEqual([
      expect.objectContaining({
        createdBy: "user-1",
        createdByName: "Admin",
        createdByEmail: "admin@example.test",
      }),
    ]);
  });
});
