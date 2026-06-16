import { ConditionFactory } from "./condition.factory";
import { CONDITIONS } from "../constants/workflow-condition.constants";

describe("ConditionFactory", () => {
  it("creates DATE_AFTER from config", () => {
    const condition = ConditionFactory.create({
      type: CONDITIONS.DATE_AFTER,
      config: { date: "2026-06-01T00:00:00.000Z" },
    } as any);

    expect(
      condition.evaluate({
        orderId: "order-1",
        isPaid: true,
        hasStock: true,
        isCancelled: false,
        invoiceSent: false,
        currentDate: new Date("2026-06-06T00:00:00.000Z"),
        variables: {},
      }).passed,
    ).toBe(true);
  });

  it("throws for unsupported types", () => {
    expect(() =>
      ConditionFactory.create({ type: "UNKNOWN", config: {} } as any),
    ).toThrow("Condicion de workflow no soportada");
  });

  it.each([
    [true, true],
    [false, false],
  ])("evaluates INVOICE_SENT when invoiceSent is %s", (invoiceSent, passed) => {
    const condition = ConditionFactory.create({
      type: "INVOICE_SENT" as any,
      config: {},
    });

    expect(
      condition.evaluate({
        orderId: "order-1",
        isPaid: false,
        hasStock: false,
        isCancelled: false,
        invoiceSent,
        currentDate: new Date(),
        variables: {},
      } as any),
    ).toEqual(expect.objectContaining({ passed, type: "INVOICE_SENT" }));
  });

  it.each(["DATE_AFTER", "DATE_BEFORE"] as const)(
    "%s includes the configured boundary",
    (type) => {
      const boundary = "2026-06-06T00:00:00.000Z";
      const condition = ConditionFactory.create({ type, config: { date: boundary } });

      expect(
        condition.evaluate({
          orderId: "order-1",
          isPaid: false,
          hasStock: false,
          isCancelled: false,
          invoiceSent: false,
          currentDate: new Date(boundary),
          variables: {},
        }).passed,
      ).toBe(true);
    },
  );

  it.each([
    ["2026-06-12T15:00:00.000Z", "2026-06-12", true],
    ["2026-06-11T15:00:00.000Z", "2026-06-12", true],
    ["2026-06-10T15:00:00.000Z", "2026-06-12", false],
    ["2026-06-13T15:00:00.000Z", "2026-06-12", false],
    ["2026-06-12T04:30:00.000Z", "2026-06-12", true],
    ["2026-06-11T15:00:00.000Z", null, false],
  ])(
    "evaluates current date %s against delivery %s",
    (currentDate, deliveryDate, passed) => {
      const condition = ConditionFactory.create({
        type: "SCHEDULE_DELIVERY_WINDOW" as any,
        config: { minDaysBefore: 0, maxDaysBefore: 1 },
      });

      expect(
        condition.evaluate({
          orderId: "order-1",
          isPaid: false,
          hasStock: false,
          isCancelled: false,
          invoiceSent: false,
          currentDate: new Date(currentDate),
          variables: { scheduleDate: "2026-06-05", deliveryDate },
        }).passed,
      ).toBe(passed);
    },
  );
});
