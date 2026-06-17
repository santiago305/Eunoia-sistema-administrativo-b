import { DateAfterCondition } from "../conditions/date-after.condition";
import { DateBeforeCondition } from "../conditions/date-before.condition";
import { Condition } from "../conditions/condition";
import { HasStockCondition } from "../conditions/has-stock.condition";
import { IsPaidCondition } from "../conditions/is-paid.condition";
import { NotCancelledCondition } from "../conditions/not-cancelled.condition";
import { WorkflowCondition } from "../entities/workflow-condition";
import { CONDITIONS } from "../constants/workflow-condition.constants";
import { InvoiceSentCondition } from "../conditions/invoice-sent.condition";
import { ScheduleDeliveryWindowCondition } from "../conditions/schedule-delivery-window.condition";
import { SaleOrderFieldRequiredCondition } from "../conditions/sale-order-field-required.condition";
import { isSaleOrderFieldValue } from "../conditions/sale-order-field-options";

export class ConditionFactory {
  static create(condition: Pick<WorkflowCondition, "type" | "config">): Condition {
    switch (condition.type) {
      case CONDITIONS.IS_PAID:
        return new IsPaidCondition();
      case CONDITIONS.HAS_STOCK:
        return new HasStockCondition();
      case CONDITIONS.NOT_CANCELLED:
        return new NotCancelledCondition();
      case CONDITIONS.DATE_AFTER:
        return new DateAfterCondition(this.parseDateConfig(condition.config));
      case CONDITIONS.DATE_BEFORE:
        return new DateBeforeCondition(this.parseDateConfig(condition.config));
      case CONDITIONS.INVOICE_SENT:
        return new InvoiceSentCondition();
      case CONDITIONS.SCHEDULE_DELIVERY_WINDOW:
        return new ScheduleDeliveryWindowCondition(
          this.parseNonNegativeInteger(condition.config.minDaysBefore, "minDaysBefore"),
          this.parseNonNegativeInteger(condition.config.maxDaysBefore, "maxDaysBefore"),
        );
      case CONDITIONS.SALE_ORDER_FIELD_REQUIRED:
        return new SaleOrderFieldRequiredCondition(
          this.parseSaleOrderField(condition.config.field));
      default:
        throw new Error("Condicion de workflow no soportada");
    }
  }

  private static parseDateConfig(config: Readonly<Record<string, unknown>>) {
    const raw = typeof config.date === "string" ? config.date : null;
    if (!raw) {
      throw new Error("Config de fecha invalida");
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      throw new Error("Config de fecha invalida");
    }

    return date;
  }

  private static parseNonNegativeInteger(value: unknown, field: string) {
    if (!Number.isInteger(value) || Number(value) < 0) {
      throw new Error(`Config ${field} invalida`);
    }
    return Number(value);
  }

  private static parseSaleOrderField(value: unknown) {
    if (!isSaleOrderFieldValue(value)) {
      throw new Error("Config field invalida");
    }
    return value;
  }
}
