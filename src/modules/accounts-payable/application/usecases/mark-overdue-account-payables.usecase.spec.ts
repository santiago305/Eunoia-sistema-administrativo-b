import { MarkOverdueAccountPayablesUsecase } from "./mark-overdue-account-payables.usecase";

describe("MarkOverdueAccountPayablesUsecase", () => {
  it("marks pending balances as overdue when due date is past", async () => {
    const repo = {
      markOverdue: jest.fn().mockResolvedValue(2),
    };
    const clock = {
      now: jest.fn(() => new Date("2026-06-21T10:00:00.000Z")),
    };
    const usecase = new MarkOverdueAccountPayablesUsecase(repo as any, clock as any);

    const result = await usecase.execute();

    expect(repo.markOverdue).toHaveBeenCalledWith(new Date("2026-06-21T10:00:00.000Z"), undefined);
    expect(result.updated).toBe(2);
  });
});
