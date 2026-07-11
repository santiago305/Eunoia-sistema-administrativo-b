import { CONDITIONS } from "../constants/workflow-condition.constants";
import { ConditionFactory } from "../factories/condition.factory";
import { SaleOrderFieldRequiredCondition } from "./sale-order-field-required.condition";

const baseContext = {
  orderId: "order-1",
  isPaid: false,
  hasStock: false,
  isCancelled: false,
  invoiceSent: false,
  currentDate: new Date("2026-06-17T12:00:00.000Z"),
  variables: {
    "client.docNumber": "12345678",
    "client.address": "Av. Lima 123",
    deliveryDate: "2026-06-20",
    note: "  ",
  },
};

describe("SaleOrderFieldRequiredCondition", () => {
  it("passes when the configured sale-order field has a non-empty value", () => {
    const result = new SaleOrderFieldRequiredCondition("client.docNumber").evaluate(baseContext);

    expect(result).toEqual({ passed: true, type: CONDITIONS.SALE_ORDER_FIELD_REQUIRED });
  });

  it("fails when the configured sale-order field is blank", () => {
    const result = new SaleOrderFieldRequiredCondition("note").evaluate(baseContext);

    expect(result).toEqual({
      passed: false,
      type: CONDITIONS.SALE_ORDER_FIELD_REQUIRED,
      reason: "Nota requerida",
      details: {
        field: "note",
        label: "Pedido tiene nota",
        missing: true,
        currentValue: "  ",
      },
    });
  });

  it("fails when the configured sale-order field is missing", () => {
    const result = new SaleOrderFieldRequiredCondition("client.reference").evaluate(baseContext);

    expect(result.passed).toBe(false);
    expect(result.type).toBe(CONDITIONS.SALE_ORDER_FIELD_REQUIRED);
    expect(result).toMatchObject({
      reason: "Referencia requerida",
      details: {
        field: "client.reference",
        label: "Cliente tiene referencia",
        missing: true,
        currentValue: undefined,
      },
    });
  });
});

describe("ConditionFactory sale-order field config", () => {
  it("creates the sale-order field condition for agencyDetail", () => {
    const condition = ConditionFactory.create({
      type: CONDITIONS.SALE_ORDER_FIELD_REQUIRED,
      config: { field: "agencyDetail" },
    });

    expect(condition).toBeInstanceOf(SaleOrderFieldRequiredCondition);
  });

  it("rejects the replaced agencySubsidiaryId field value", () => {
    expect(() =>
      ConditionFactory.create({
        type: CONDITIONS.SALE_ORDER_FIELD_REQUIRED,
        config: { field: "agencySubsidiaryId" },
      }),
    ).toThrow("Config field invalida");
  });
  it("creates the sale-order field condition for an allowed field value", () => {
    const condition = ConditionFactory.create({
      type: CONDITIONS.SALE_ORDER_FIELD_REQUIRED,
      config: { field: "client.address" },
    });

    expect(condition).toBeInstanceOf(SaleOrderFieldRequiredCondition);
  });

  it("rejects a missing sale-order field value", () => {
    expect(() =>
      ConditionFactory.create({
        type: CONDITIONS.SALE_ORDER_FIELD_REQUIRED,
        config: {},
      }),
    ).toThrow("Config field invalida");
  });

  it("rejects an unknown sale-order field value", () => {
    expect(() =>
      ConditionFactory.create({
        type: CONDITIONS.SALE_ORDER_FIELD_REQUIRED,
        config: { field: "client.password" },
      }),
    ).toThrow("Config field invalida");
  });
});
