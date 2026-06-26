import { RecurringPurchaseTemplate } from "./recurring-purchase-template";

describe("RecurringPurchaseTemplate", () => {
  it("creates an active template with the first due date as next due date", () => {
    const template = RecurringPurchaseTemplate.create({
      supplierId: "11111111-1111-4111-8111-111111111111",
      name: "Hosting mensual",
      frequency: "MONTHLY",
      currency: "PEN",
      amount: 120,
      startDate: new Date("2026-06-10T00:00:00.000Z"),
      createdByUserId: "22222222-2222-4222-8222-222222222222",
    });

    expect(template.status).toBe("ACTIVE");
    expect(template.nextDueDate.toISOString()).toBe("2026-06-10T00:00:00.000Z");
    expect(template.reminderDaysBefore).toEqual([7, 3, 1]);
  });

  it("rejects templates with non positive amounts", () => {
    expect(() =>
      RecurringPurchaseTemplate.create({
        supplierId: "11111111-1111-4111-8111-111111111111",
        name: "Servicio",
        frequency: "MONTHLY",
        currency: "PEN",
        amount: 0,
        startDate: new Date("2026-06-10T00:00:00.000Z"),
      }),
    ).toThrow("El monto recurrente debe ser mayor a cero");
  });

  it("pauses resumes and cancels a template", () => {
    const template = RecurringPurchaseTemplate.create({
      supplierId: "11111111-1111-4111-8111-111111111111",
      name: "Membresia",
      frequency: "ANNUAL",
      currency: "USD",
      amount: 300,
      startDate: new Date("2026-01-01T00:00:00.000Z"),
    });

    const paused = template.pause(new Date("2026-01-02T00:00:00.000Z"));
    const resumed = paused.resume(new Date("2026-01-03T00:00:00.000Z"));
    const cancelled = resumed.cancel(new Date("2026-01-04T00:00:00.000Z"));

    expect(paused.status).toBe("PAUSED");
    expect(resumed.status).toBe("ACTIVE");
    expect(cancelled.status).toBe("CANCELLED");
    expect(() => cancelled.resume()).toThrow("No se puede reanudar una recurrencia cancelada");
  });
});
