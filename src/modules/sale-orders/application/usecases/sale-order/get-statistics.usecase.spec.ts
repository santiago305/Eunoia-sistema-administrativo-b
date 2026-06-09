import { GetSaleOrderStatisticsUsecase } from "./get-statistics.usecase";

describe("GetSaleOrderStatisticsUsecase", () => {
  it("sanitizes filters and defaults includeCancelled to false", async () => {
    const repository = { statistics: jest.fn().mockResolvedValue({}) };
    const usecase = new GetSaleOrderStatisticsUsecase(repository as any);

    await usecase.execute({
      q: " S01 ",
      filters: [{ field: "workflowId", operator: "in", values: ["workflow-1"] }] as any,
    });

    expect(repository.statistics).toHaveBeenCalledWith({
      q: "S01",
      filters: [{ field: "workflowId", operator: "in", mode: "include", values: ["workflow-1"] }],
      includeCancelled: false,
    });
  });
});
