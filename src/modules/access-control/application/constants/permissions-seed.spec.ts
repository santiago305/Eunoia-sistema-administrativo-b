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
});

