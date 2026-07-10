import { RecurringFrequency } from "../value-objects/recurring-frequency";

export const getBillingAnchorDay = (date: Date) => date.getUTCDate();

const daysInUtcMonth = (year: number, monthIndex: number) =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

const buildClampedUtcDate = (
  year: number,
  monthIndex: number,
  anchorDay: number,
  source: Date,
) => {
  const day = Math.min(anchorDay, daysInUtcMonth(year, monthIndex));
  return new Date(
    Date.UTC(
      year,
      monthIndex,
      day,
      source.getUTCHours(),
      source.getUTCMinutes(),
      source.getUTCSeconds(),
      source.getUTCMilliseconds(),
    ),
  );
};

export const calculateNextRecurringDueDate = (
  currentDueDate: Date,
  frequency: RecurringFrequency,
  billingAnchorDay: number,
) => {
  const targetMonthOffset = frequency === "ANNUAL" ? 12 : 1;
  const target = new Date(
    Date.UTC(
      currentDueDate.getUTCFullYear(),
      currentDueDate.getUTCMonth() + targetMonthOffset,
      1,
      currentDueDate.getUTCHours(),
      currentDueDate.getUTCMinutes(),
      currentDueDate.getUTCSeconds(),
      currentDueDate.getUTCMilliseconds(),
    ),
  );

  return buildClampedUtcDate(
    target.getUTCFullYear(),
    target.getUTCMonth(),
    billingAnchorDay,
    currentDueDate,
  );
};

export const calculateFirstRecurringDueDate = (
  startDate: Date,
  frequency: RecurringFrequency,
) => calculateNextRecurringDueDate(startDate, frequency, getBillingAnchorDay(startDate));
