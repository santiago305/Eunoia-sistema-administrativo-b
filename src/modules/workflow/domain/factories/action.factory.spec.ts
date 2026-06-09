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
});
