import { CreateWarehouseUsecase } from "./create.usecase";

describe("CreateWarehouseUsecase", () => {
  const input = {
    name: "Almacén Central",
    department: "Lima",
    province: "Lima",
    district: "Cercado de Lima",
    address: "Av. Principal 123",
  };

  const setup = () => {
    const tx = { transactionId: "warehouse-transaction" };
    const uow = { runInTransaction: jest.fn((work) => work(tx)) } as any;
    const warehouseRepo = { create: jest.fn(async (warehouse) => warehouse) } as any;
    const clock = { now: jest.fn(() => new Date("2026-07-20T00:00:00.000Z")) } as any;
    const createSerieUseCase = { execute: jest.fn().mockResolvedValue(undefined) } as any;
    const createLocation = { execute: jest.fn().mockResolvedValue(undefined) } as any;
    const usecase = new CreateWarehouseUsecase(uow, warehouseRepo, clock, createSerieUseCase, createLocation);

    return { usecase, tx, uow, warehouseRepo, createSerieUseCase, createLocation };
  };

  it("creates the warehouse, five default series and the initial location in one transaction", async () => {
    const { usecase, tx, uow, warehouseRepo, createSerieUseCase, createLocation } = setup();

    await usecase.execute(input);

    expect(uow.runInTransaction).toHaveBeenCalledTimes(1);
    expect(warehouseRepo.create).toHaveBeenCalledWith(expect.anything(), tx);
    expect(createSerieUseCase.execute).toHaveBeenCalledTimes(5);
    expect(createSerieUseCase.execute.mock.calls.map(([, context]) => context)).toEqual([tx, tx, tx, tx, tx]);
    expect(createSerieUseCase.execute.mock.calls.map(([serie]) => serie.code)).toEqual(["IN", "OUT", "TRF", "ADJ", "PRO"]);
    expect(createLocation.execute).toHaveBeenCalledWith(
      { warehouseId: expect.anything(), code: "ANAQUEL 01" },
      tx,
    );
  });

  it("fails safely when a default series cannot be created", async () => {
    const { usecase, createSerieUseCase, createLocation } = setup();
    createSerieUseCase.execute.mockRejectedValueOnce(new Error("database constraint"));

    await expect(usecase.execute(input)).rejects.toMatchObject({
      response: expect.objectContaining({
        message: "No se pudieron crear series por defecto",
        errorCode: "WAREHOUSE_DEFAULT_SERIES_FAILED",
        errorRef: expect.any(String),
      }),
    });
    expect(createLocation.execute).not.toHaveBeenCalled();
  });
});
