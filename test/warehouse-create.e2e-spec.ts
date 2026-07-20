import { CreateWarehouseUsecase } from "src/modules/warehouses/application/usecases/warehouse/create.usecase";

type TransactionState = {
  warehouses: unknown[];
  series: unknown[];
  locations: unknown[];
};

describe("Warehouse creation transaction (e2e)", () => {
  const input = {
    name: "Almacén Central",
    department: "Lima",
    province: "Lima",
    district: "Cercado de Lima",
    address: "Av. Principal 123",
  };

  const setup = (failOnSerieCode?: string) => {
    const persisted: TransactionState = { warehouses: [], series: [], locations: [] };
    const uow = {
      runInTransaction: async (work: (tx: TransactionState) => Promise<unknown>) => {
        const tx: TransactionState = { warehouses: [], series: [], locations: [] };
        const result = await work(tx);
        persisted.warehouses.push(...tx.warehouses);
        persisted.series.push(...tx.series);
        persisted.locations.push(...tx.locations);
        return result;
      },
    };
    const warehouseRepo = {
      create: jest.fn(async (warehouse, tx: TransactionState) => {
        tx.warehouses.push(warehouse);
        return warehouse;
      }),
    };
    const createSerieUseCase = {
      execute: jest.fn(async (serie, tx: TransactionState) => {
        if (serie.code === failOnSerieCode) throw new Error("forced serie failure");
        if (tx.series.some((existing: any) => existing.code === serie.code && existing.warehouseId === serie.warehouseId)) {
          throw new Error("duplicate serie code in warehouse");
        }
        tx.series.push(serie);
      }),
    };
    const createLocation = {
      execute: jest.fn(async (location, tx: TransactionState) => {
        tx.locations.push(location);
      }),
    };
    const clock = { now: () => new Date("2026-07-20T00:00:00.000Z") };
    const usecase = new CreateWarehouseUsecase(uow as any, warehouseRepo as any, clock as any, createSerieUseCase as any, createLocation as any);

    return { usecase, persisted };
  };

  it("persists one warehouse, five unique series and one initial location", async () => {
    const { usecase, persisted } = setup();

    await usecase.execute(input);

    expect(persisted.warehouses).toHaveLength(1);
    expect(persisted.series).toHaveLength(5);
    expect(new Set(persisted.series.map((serie: any) => serie.code)).size).toBe(5);
    expect(persisted.locations).toEqual([{ warehouseId: expect.anything(), code: "ANAQUEL 01" }]);
  });

  it("rolls back all records when creating a series fails", async () => {
    const { usecase, persisted } = setup("TRF");

    await expect(usecase.execute(input)).rejects.toThrow("No se pudieron crear series por defecto");

    expect(persisted).toEqual({ warehouses: [], series: [], locations: [] });
  });
});
