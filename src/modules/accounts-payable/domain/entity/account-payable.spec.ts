import { AccountPayable } from "./account-payable";

describe("AccountPayable", () => {
  it("creates a valid pending payable with total amount as pending amount", () => {
    const payable = AccountPayable.create({
      purchaseId: "po-1",
      quotaId: "quota-1",
      supplierId: "supplier-1",
      description: "Cuota 1",
      currency: "PEN",
      amountTotal: 1000,
      dueDate: new Date("2026-07-01T00:00:00.000Z"),
      createdByUserId: "user-1",
    });

    expect(payable.amountPaid).toBe(0);
    expect(payable.amountPending).toBe(1000);
    expect(payable.status).toBe("PENDING");
  });
});
