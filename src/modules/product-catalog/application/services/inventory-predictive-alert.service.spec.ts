import { calculatePredictiveAlert, previousBusinessDays } from "./inventory-predictive-alert.service";

describe("inventory predictive alerts", () => {
  it("excludes Sunday from the rolling history", () => {
    expect(previousBusinessDays(3, new Date("2026-08-10T12:00:00Z"))).toEqual(["2026-08-06", "2026-08-07", "2026-08-08"]);
  });

  it("does not alert while consumption average is zero", () => {
    expect(calculatePredictiveAlert({ consumptions: [0, 0, 0], historyDays: 3, targetDays: 3, availableStock: 0, enabled: true }).level).toBe("NORMAL");
  });

  it("includes zero days and warns when coverage is insufficient", () => {
    const result = calculatePredictiveAlert({ consumptions: [6, 4, 5], historyDays: 3, targetDays: 3, availableStock: 10, enabled: true });
    expect(result.averageDailyConsumption).toBe(5);
    expect(result.coverageDays).toBe(2);
    expect(result.shortage).toBe(5);
    expect(result.level).toBe("WARNING");
  });
});
