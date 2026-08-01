import { ACTIONS } from "src/modules/workflow/domain/constants/workflow-action.constants";
import { buildSaleOrderTrackingCapabilities } from "./sale-order-tracking-capabilities";

describe("buildSaleOrderTrackingCapabilities", () => {
  it("returns no optional tracking capabilities without recognized actions", () => {
    expect(buildSaleOrderTrackingCapabilities([])).toEqual({
      invoice: false,
      preguide: false,
      prepared: false,
    });

    expect(buildSaleOrderTrackingCapabilities(["UNKNOWN_ACTION"])).toEqual({
      invoice: false,
      preguide: false,
      prepared: false,
    });
  });

  it("enables invoice only from MARK_INVOICE_SENT", () => {
    expect(
      buildSaleOrderTrackingCapabilities([ACTIONS.MARK_INVOICE_SENT]),
    ).toEqual({
      invoice: true,
      preguide: false,
      prepared: false,
    });
  });

  it.each([ACTIONS.MARK_PREGUIDE, ACTIONS.UNMARK_PREGUIDE])(
    "enables preguide from %s",
    (actionType) => {
      expect(buildSaleOrderTrackingCapabilities([actionType])).toEqual({
        invoice: false,
        preguide: true,
        prepared: false,
      });
    },
  );

  it.each([ACTIONS.MARK_PREPARED, ACTIONS.UNMARK_PREPARED])(
    "enables preparation from %s",
    (actionType) => {
      expect(buildSaleOrderTrackingCapabilities([actionType])).toEqual({
        invoice: false,
        preguide: false,
        prepared: true,
      });
    },
  );
});
