import { PERMISSIONS_SEED, ROLE_PERMISSION_SEED } from "./permissions-seed";

describe("permissions seed", () => {
  it("includes page.payments.view", () => {
    const hasPagePayments = PERMISSIONS_SEED.some((item) => item.code === "page.payments.view");
    expect(hasPagePayments).toBe(true);
  });

  it("includes payments.read and payments.manage", () => {
    const codes = new Set(PERMISSIONS_SEED.map((item) => item.code));
    expect(codes.has("payments.read")).toBe(true);
    expect(codes.has("payments.manage")).toBe(true);
  });

  it("assigns payments page permission to moderator and adviser", () => {
    expect(ROLE_PERMISSION_SEED.moderator).toContain("page.payments.view");
    expect(ROLE_PERMISSION_SEED.adviser).toContain("page.payments.view");
  });

  it("does not define duplicated permission codes", () => {
    const codes = PERMISSIONS_SEED.map((item) => item.code);
    const uniqueCodes = new Set(codes);

    expect(uniqueCodes.size).toBe(codes.length);
  });

  it("includes fine catalog and inventory permissions", () => {
    const codes = new Set(PERMISSIONS_SEED.map((item) => item.code));

    expect(codes.has("page.products.view")).toBe(true);
    expect(codes.has("page.materials.view")).toBe(true);
    expect(codes.has("products.create")).toBe(true);
    expect(codes.has("materials.create")).toBe(true);
    expect(codes.has("products.skus.create")).toBe(false);
    expect(codes.has("products.skus.update")).toBe(false);
    expect(codes.has("materials.skus.create")).toBe(false);
    expect(codes.has("materials.skus.update")).toBe(false);
    expect(codes.has("transfers.products.process")).toBe(true);
    expect(codes.has("adjustments.materials.process")).toBe(true);
    expect(codes.has("inventory-alerts.receive_mail")).toBe(true);
  });

  it("assigns seeded role permissions that exist in the permission catalog", () => {
    const codes = new Set(PERMISSIONS_SEED.map((item) => item.code));

    for (const roleCodes of Object.values(ROLE_PERMISSION_SEED)) {
      for (const code of roleCodes) {
        expect(code === "*" || codes.has(code)).toBe(true);
      }
    }
  });
});

