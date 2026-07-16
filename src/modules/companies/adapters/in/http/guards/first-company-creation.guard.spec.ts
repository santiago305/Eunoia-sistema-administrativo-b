import { ForbiddenException } from "@nestjs/common";
import { FirstCompanyCreationGuard } from "./first-company-creation.guard";

describe("FirstCompanyCreationGuard", () => {
  const buildContext = (user?: { id?: string; sub?: string }) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as never;

  const buildGuard = (company: unknown, hasPermission = false) => {
    const companyRepo = {
      findSingle: jest.fn().mockResolvedValue(company),
    };
    const accessControlService = {
      userHasAllPermissions: jest.fn().mockResolvedValue(hasPermission),
    };

    const guard = new FirstCompanyCreationGuard(
      companyRepo as never,
      accessControlService as never,
    );

    return { guard, companyRepo, accessControlService };
  };

  it("allows creating the first company without company.manage", async () => {
    const { guard, accessControlService } = buildGuard(null);

    await expect(guard.canActivate(buildContext({ id: "user-1" }))).resolves.toBe(true);
    expect(accessControlService.userHasAllPermissions).not.toHaveBeenCalled();
  });

  it("denies creating another company when the user lacks company.manage", async () => {
    const { guard, accessControlService } = buildGuard({ companyId: "company-1" }, false);

    await expect(guard.canActivate(buildContext({ id: "user-1" }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(accessControlService.userHasAllPermissions).toHaveBeenCalledWith("user-1", [
      "company.manage",
    ]);
  });

  it("allows creating another company only when the user has company.manage", async () => {
    const { guard, accessControlService } = buildGuard({ companyId: "company-1" }, true);

    await expect(guard.canActivate(buildContext({ sub: "user-1" }))).resolves.toBe(true);
    expect(accessControlService.userHasAllPermissions).toHaveBeenCalledWith("user-1", [
      "company.manage",
    ]);
  });

  it("delegates root wildcard access to access control when a company already exists", async () => {
    const { guard, accessControlService } = buildGuard({ companyId: "company-1" }, true);

    await expect(guard.canActivate(buildContext({ id: "root-1" }))).resolves.toBe(true);
    expect(accessControlService.userHasAllPermissions).toHaveBeenCalledWith("root-1", [
      "company.manage",
    ]);
  });
});
