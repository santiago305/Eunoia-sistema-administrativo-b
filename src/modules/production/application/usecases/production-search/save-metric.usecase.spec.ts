import { SaveProductionOrderSearchMetricUsecase } from "./save-metric.usecase";

describe("SaveProductionOrderSearchMetricUsecase", () => {
  const makeUseCase = (overrides?: { searchStorage?: any }) => {
    const searchStorage = overrides?.searchStorage ?? {
      createMetric: jest.fn().mockResolvedValue({
        metricId: "metric-1",
        name: "Produccion borrador",
        snapshot: { filters: [{ field: "status", operator: "in", values: ["DRAFT"] }] },
        updatedAt: new Date(),
      }),
    };

    return {
      useCase: new SaveProductionOrderSearchMetricUsecase(searchStorage),
      searchStorage,
    };
  };

  it("rejects empty criteria", async () => {
    const { useCase, searchStorage } = makeUseCase();

    const result = await useCase.execute({
      userId: "user-1",
      name: "Borrador",
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
      snapshot: { filters: [{ field: "status", operator: "in", values: ["DRAFT"] }] },
    });

    expect(result).toEqual({
      type: "error",
      message: "El nombre de la metrica es obligatorio",
    });
    expect(searchStorage.createMetric).not.toHaveBeenCalled();
  });
});
