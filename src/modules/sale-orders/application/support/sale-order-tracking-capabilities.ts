import { ACTIONS } from "src/modules/workflow/domain/constants/workflow-action.constants";
import { SaleOrderTrackingCapabilities } from "../dtos/sale-order-search/sale-order-search-snapshot";

export function buildSaleOrderTrackingCapabilities(
  actionTypes: Iterable<string>,
): SaleOrderTrackingCapabilities {
  const capabilities: SaleOrderTrackingCapabilities = {
    invoice: false,
    preguide: false,
    prepared: false,
  };

  for (const actionType of actionTypes) {
    if (actionType === ACTIONS.MARK_INVOICE_SENT) {
      capabilities.invoice = true;
    }

    if (
      actionType === ACTIONS.MARK_PREGUIDE ||
      actionType === ACTIONS.UNMARK_PREGUIDE
    ) {
      capabilities.preguide = true;
    }

    if (
      actionType === ACTIONS.MARK_PREPARED ||
      actionType === ACTIONS.UNMARK_PREPARED
    ) {
      capabilities.prepared = true;
    }
  }

  return capabilities;
}
