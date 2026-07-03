import { ActionFactory } from "./action.factory";
import { ACTIONS } from "../constants/workflow-action.constants";

describe("ActionFactory", () => {
  it.each([ACTIONS.RESERVE_STOCK, ACTIONS.CONSUME_STOCK, ACTIONS.REVERT_STOCK] as const)(
    "accepts the supported %s action",
    (type) => {
      expect(() => ActionFactory.validate({ type, config: {} })).not.toThrow();
    },
  );

  it("rejects unsupported action types", () => {
    expect(() => ActionFactory.validate({ type: "UNKNOWN", config: {} } as any)).toThrow(
      "Accion de workflow no soportada",
    );
  });

  it("accepts a valid province warehouse assignment", () => {
    expect(() =>
      ActionFactory.validate({
        type: "ASSIGN_WAREHOUSE_BY_PROVINCE",
        config: {
          mode: "INCLUDE",
          provinceIds: ["1501"],
          warehouseId: "22222222-2222-4222-8222-222222222222",
        },
      } as any),
    ).not.toThrow();
  });

  it.each([
    [{ mode: "OTHER", provinceIds: ["1501"], warehouseId: "22222222-2222-4222-8222-222222222222" }],
    [{ mode: "INCLUDE", provinceIds: [], warehouseId: "22222222-2222-4222-8222-222222222222" }],
    [{ mode: "INCLUDE", provinceIds: ["invalid"], warehouseId: "22222222-2222-4222-8222-222222222222" }],
    [{ mode: "INCLUDE", provinceIds: ["1501"], warehouseId: "invalid" }],
  ])("rejects invalid province warehouse config %o", (config) => {
    expect(() =>
      ActionFactory.validate({
        type: "ASSIGN_WAREHOUSE_BY_PROVINCE",
        config,
      } as any),
    ).toThrow("Configuracion de asignacion de almacen invalida");
  });

  it("rejects assigning a warehouse after a stock action", () => {
    expect(() =>
      ActionFactory.validateOrder([
        { type: ACTIONS.RESERVE_STOCK, config: {}, position: 0 },
        {
          type: "ASSIGN_WAREHOUSE_BY_PROVINCE",
          config: {
            mode: "INCLUDE",
            provinceIds: ["1501"],
            warehouseId: "22222222-2222-4222-8222-222222222222",
          },
          position: 1,
        },
      ] as any),
    ).toThrow("La asignacion de almacen debe ejecutarse antes de las acciones de stock");
  });

  it("rejects assigning a warehouse at the same position as a stock action", () => {
    expect(() =>
      ActionFactory.validateOrder([
        { type: ACTIONS.RESERVE_STOCK, config: {}, position: 0 },
        {
          type: "ASSIGN_WAREHOUSE_BY_PROVINCE",
          config: {},
          position: 0,
        },
      ] as any),
    ).toThrow("La asignacion de almacen debe ejecutarse antes de las acciones de stock");
  });
});
