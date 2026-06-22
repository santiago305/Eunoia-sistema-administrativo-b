import { ListPaymentsUsecase } from "./list.usecase";

describe("ListPaymentsUsecase", () => {
  it("passes status filter to the payment repository", async () => {
    const repo = {
      list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    const usecase = new ListPaymentsUsecase(repo as any);

    await usecase.execute({
      page: 2,
      limit: 15,
      status: "PENDING_APPROVAL",
    });

    expect(repo.list).toHaveBeenCalledWith({
      page: 2,
      limit: 15,
      status: "PENDING_APPROVAL",
    });
  });

  it("passes scheduled status filter to the payment repository", async () => {
    const repo = {
      list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    const usecase = new ListPaymentsUsecase(repo as any);

    await usecase.execute({
      status: "SCHEDULED",
    });

    expect(repo.list).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      status: "SCHEDULED",
    });
  });
});
