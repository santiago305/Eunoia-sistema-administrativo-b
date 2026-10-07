import { SaveIncomeSearchMetricUsecase } from "./save-metric.usecase";

describe("SaveIncomeSearchMetricUsecase", () => {
  it("rejects a metric without search criteria", async () => {
    const storage = { createMetric: jest.fn() };
    const usecase = new SaveIncomeSearchMetricUsecase(storage as any);

    const result = await usecase.execute({
      userId: "user-1",
      name: "Sin filtros",
      snapshot: { q: " ", filters: [] },
    });

    expect(result).toEqual({
      type: "error",
      message: "No hay filtros para guardar en la metrica",
    });
    expect(storage.createMetric).not.toHaveBeenCalled();
  });

  it("sanitizes and persists the metric under the income table key", async () => {
    const storage = {
      createMetric: jest.fn().mockResolvedValue({
        metricId: "metric-1",
        name: "Ingresos contabilizados",
        snapshot: { q: "PE-531", filters: [] },
        updatedAt: new Date("2026-07-13T10:00:00.000Z"),
      }),
    };
    const usecase = new SaveIncomeSearchMetricUsecase(storage as any);

    const result = await usecase.execute({
      userId: "user-1",
      name: "  Ingresos contabilizados  ",
      snapshot: {
        q: " PE-531 ",
        filters: [],
      },
    });

    expect(storage.createMetric).toHaveBeenCalledWith({
      userId: "user-1",
      tableKey: "income",
      name: "Ingresos contabilizados",
      snapshot: { q: "PE-531", filters: [] },
    });
    expect(result.type).toBe("success");
  });
});
