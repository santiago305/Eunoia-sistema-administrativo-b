import { SaveWarehouseSearchMetricUsecase } from "./save-metric.usecase";

describe("SaveWarehouseSearchMetricUsecase", () => {
  const makeUseCase = (overrides?: { searchStorage?: any }) => {
    const searchStorage = overrides?.searchStorage ?? {
      createMetric: jest.fn().mockResolvedValue({
        metricId: "metric-1",
        name: "Almacenes Lima",
        snapshot: { filters: [{ field: "department", operator: "in", values: ["Lima"] }] },
        updatedAt: new Date(),
      }),
    };

    return {
      useCase: new SaveWarehouseSearchMetricUsecase(searchStorage),
      searchStorage,
    };
  };

  it("rejects empty criteria", async () => {
    const { useCase, searchStorage } = makeUseCase();

    const result = await useCase.execute({
      userId: "user-1",
      name: "Lima",
      snapshot: { filters: [] },
    });

    expect(result).toEqual({
      type: "error",
      message: "No hay filtros para guardar en la metrica",
    });
    expect(searchStorage.createMetric).not.toHaveBeenCalled();
  });

  it("rejects blank names", async () => {
    const { useCase, searchStorage } = makeUseCase();

    const result = await useCase.execute({
      userId: "user-1",
      name: "   ",
      snapshot: { filters: [{ field: "department", operator: "in", values: ["Lima"] }] },
    });

    expect(result).toEqual({
      type: "error",
      message: "El nombre de la metrica es obligatorio",
    });
    expect(searchStorage.createMetric).not.toHaveBeenCalled();
  });
});
