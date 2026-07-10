import {
  calculateFirstRecurringDueDate,
  calculateNextRecurringDueDate,
  getBillingAnchorDay,
} from "./recurring-due-date-calculator";

describe("recurring due date calculator", () => {
  it("sets the first monthly due date one month after the purchase date", () => {
    const startDate = new Date("2026-07-14T00:00:00.000Z");

    const dueDate = calculateFirstRecurringDueDate(startDate, "MONTHLY");

    expect(dueDate.toISOString()).toBe("2026-08-14T00:00:00.000Z");
    expect(getBillingAnchorDay(startDate)).toBe(14);
  });

  it("uses the last valid day when the next month does not have the anchor day", () => {
    const startDate = new Date("2026-01-31T00:00:00.000Z");

    const firstDueDate = calculateFirstRecurringDueDate(startDate, "MONTHLY");
    const secondDueDate = calculateNextRecurringDueDate(firstDueDate, "MONTHLY", 31);

    expect(firstDueDate.toISOString()).toBe("2026-02-28T00:00:00.000Z");
    expect(secondDueDate.toISOString()).toBe("2026-03-31T00:00:00.000Z");
  });

  it("keeps annual due dates on the same month and clamps leap days", () => {
    const startDate = new Date("2024-02-29T00:00:00.000Z");

    const firstDueDate = calculateFirstRecurringDueDate(startDate, "ANNUAL");

    expect(firstDueDate.toISOString()).toBe("2025-02-28T00:00:00.000Z");
  });
});
