import { SaveSupplierSearchMetricUsecase } from "./save-metric.usecase";

describe("SaveSupplierSearchMetricUsecase", () => {
  const makeUseCase = (overrides?: { searchStorage?: any }) => {
    const searchStorage = overrides?.searchStorage ?? {
      createMetric: jest.fn().mockResolvedValue({
        metricId: "metric-1",
        name: "Favoritos",
        snapshot: { q: "ana", filters: [] },
        updatedAt: new Date(),
      }),
    };

    return {
      useCase: new SaveSupplierSearchMetricUsecase(searchStorage),
      searchStorage,
    };
  };

  it("rejects empty criteria", async () => {
    const { useCase, searchStorage } = makeUseCase();

    const result = await useCase.execute({
      userId: "user-1",
      name: "Favoritos",
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
      snapshot: { q: "ana", filters: [] },
    });

    expect(result).toEqual({
      type: "error",
      message: "El nombre de la metrica es obligatorio",
    });
    expect(searchStorage.createMetric).not.toHaveBeenCalled();
  });
});
