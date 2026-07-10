import {
  NOTIFICATION_MODULE_LABELS,
  NOTIFICATION_MODULE_PERMISSIONS,
} from "./notification-module-permissions";

describe("notification module permissions", () => {
  it("registers recurring purchases with its notification permission", () => {
    expect(NOTIFICATION_MODULE_PERMISSIONS["recurring-purchases"]).toEqual([
      "recurring_purchases.receive_due_notifications",
    ]);
    expect(NOTIFICATION_MODULE_LABELS["recurring-purchases"]).toBe("Compras recurrentes");
  });
});
