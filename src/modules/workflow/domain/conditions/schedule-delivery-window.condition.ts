import { CONDITIONS } from "../constants/workflow-condition.constants";
import { Condition, ConditionEvaluation, WorkflowContext } from "./condition";

const DAY_MS = 86_400_000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const BUSINESS_TIME_ZONE = "America/Lima";

function parseDateOnly(value: unknown): number | null {
  if (typeof value !== "string" || !DATE_ONLY.test(value)) {
    return null;
  }

  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function currentDateOnly(date: Date): number | null {
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = new Map(parts.map((part) => [part.type, part.value]));

  return parseDateOnly(`${byType.get("year")}-${byType.get("month")}-${byType.get("day")}`);
}

export class ScheduleDeliveryWindowCondition implements Condition {
  constructor(
    private readonly minDaysBefore: number,
    private readonly maxDaysBefore: number,
  ) {}

  evaluate(context: WorkflowContext): ConditionEvaluation {
    const scheduleDate = currentDateOnly(context.currentDate);
    const deliveryDate = parseDateOnly(context.variables.deliveryDate);
    if (scheduleDate === null || deliveryDate === null) {
      return {
        passed: false,
        type: CONDITIONS.SCHEDULE_DELIVERY_WINDOW,
        reason: "La fecha de agenda o entrega es invalida",
      };
    }

    const daysBefore = (deliveryDate - scheduleDate) / DAY_MS;
    const passed = daysBefore >= this.minDaysBefore && daysBefore <= this.maxDaysBefore;

    return passed
      ? { passed: true, type: CONDITIONS.SCHEDULE_DELIVERY_WINDOW }
      : {
          passed: false,
          type: CONDITIONS.SCHEDULE_DELIVERY_WINDOW,
          reason: "La fecha de agenda esta fuera del rango de entrega",
        };
  }
}
