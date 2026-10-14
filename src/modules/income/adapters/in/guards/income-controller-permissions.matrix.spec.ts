import "reflect-metadata";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { Reflector } from "@nestjs/core";
import {
  DYNAMIC_PERMISSION_GROUPS_KEY,
  PERMISSION_GROUPS_KEY,
  PERMISSIONS_KEY,
  type PermissionGroupsResolver,
} from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { AccessControlService } from "src/modules/access-control/application/services/access-control.service";
import { PERMISSIONS_SEED } from "src/modules/access-control/application/constants/permissions-seed";
import { IncomeController } from "../controllers/income.controller";
import { SaleOrdersController } from "../../../../sale-orders/adapters/in/controllers/sale-orders.controller";
import { CompanyPaymentAccountsController } from "../../../../company-payment-accounts/adapters/in/controllers/company-payment-accounts.controller";
import { AdminFinanceController } from "../../../../admin-finance/adapters/in/controllers/admin-finance.controller";

type IncomeEndpoint = { name: string; handler: (...args: never[]) => unknown };
type PermissionMatrixController =
  | typeof IncomeController
  | typeof SaleOrdersController
  | typeof CompanyPaymentAccountsController
  | typeof AdminFinanceController;

function discoverHttpEndpoints(controller: PermissionMatrixController): IncomeEndpoint[] {
  return Object.getOwnPropertyNames(controller.prototype)
    .filter((name) => name !== "constructor")
    .map((name) => ({
      name,
      handler: (controller.prototype as unknown as Record<string, (...args: never[]) => unknown>)[name],
    }))
    .filter(({ handler }) =>
      typeof handler === "function" &&
      Reflect.hasMetadata(PATH_METADATA, handler) &&
      Reflect.hasMetadata(METHOD_METADATA, handler),
    );
}

const endpointCases: IncomeEndpoint[] = Object.getOwnPropertyNames(IncomeController.prototype)
  .filter((name) => name !== "constructor")
  .map((name) => ({
    name,
    handler: (IncomeController.prototype as unknown as Record<string, (...args: never[]) => unknown>)[name],
  }))
  .filter((endpoint) => typeof endpoint.handler === "function");

const request = { user: { id: "permission-matrix-user" }, body: {}, query: {}, params: {} };

function contextFor(
  handler: (...args: never[]) => unknown,
  controller: PermissionMatrixController = IncomeController,
) {
  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function endpointPermissions(handler: (...args: never[]) => unknown) {
  const permissions = (Reflect.getMetadata(PERMISSIONS_KEY, handler) as string[] | undefined) ?? [];
  const groups = (Reflect.getMetadata(PERMISSION_GROUPS_KEY, handler) as string[][] | undefined) ?? [];
  const resolver = Reflect.getMetadata(DYNAMIC_PERMISSION_GROUPS_KEY, handler) as PermissionGroupsResolver | undefined;
  const dynamicGroups = resolver?.(request) ?? [];
  return { permissions, groups: [...groups, ...dynamicGroups] };
}

describe("IncomeController permission matrix", () => {
  it("covers every IncomeController handler rather than a manually maintained subset", () => {
    expect(endpointCases.length).toBeGreaterThan(40);
    for (const { name, handler } of endpointCases) {
      const permissions = Reflect.getMetadata(PERMISSIONS_KEY, handler) as string[] | undefined;
      if (!permissions?.length) throw new Error(`${name} must declare explicit permissions`);
    }
  });

  it.each(endpointCases)("$name allows the complete permission set and global administrators", async ({ handler }) => {
    const { permissions, groups } = endpointPermissions(handler);
    const completeSet = [...permissions, ...groups.map((group) => group[0])];
    const accessControl = { getEffectivePermissions: jest.fn().mockResolvedValue(completeSet) };
    const guard = new PermissionsGuard(new Reflector(), accessControl as unknown as AccessControlService);

    await expect(guard.canActivate(contextFor(handler))).resolves.toBe(true);

    accessControl.getEffectivePermissions.mockResolvedValue(["*"]);
    await expect(guard.canActivate(contextFor(handler))).resolves.toBe(true);
  });

  it.each(endpointCases)("$name denies every missing required permission or access group", async ({ handler }) => {
    const { permissions, groups } = endpointPermissions(handler);
    const accessControl = { getEffectivePermissions: jest.fn() };
    const guard = new PermissionsGuard(new Reflector(), accessControl as unknown as AccessControlService);

    for (const missingPermission of permissions) {
      const alternatives = groups.map((group) => group.find((permission) => permission !== missingPermission) ?? group[0]);
      accessControl.getEffectivePermissions.mockResolvedValue([
        ...permissions.filter((permission) => permission !== missingPermission),
        ...alternatives,
      ]);
      await expect(guard.canActivate(contextFor(handler))).rejects.toBeInstanceOf(ForbiddenException);
    }

    for (const missingGroup of groups) {
      const groupAlternatives = groups
        .filter((group) => group !== missingGroup)
        .map((group) => group[0]);
      accessControl.getEffectivePermissions.mockResolvedValue([
        ...permissions,
        ...groupAlternatives,
      ]);
      await expect(guard.canActivate(contextFor(handler))).rejects.toBeInstanceOf(ForbiddenException);
    }
  });
});

const saleOrderRouteEndpoints = discoverHttpEndpoints(SaleOrdersController);

describe("SaleOrdersController permission matrix", () => {
  it("discovers every HTTP route and requires explicit permission metadata", () => {
    expect(saleOrderRouteEndpoints.length).toBeGreaterThan(40);
    for (const { name, handler } of saleOrderRouteEndpoints) {
      const { permissions, groups } = endpointPermissions(handler);
      const hasDynamicGroups = Boolean(
        Reflect.getMetadata(DYNAMIC_PERMISSION_GROUPS_KEY, handler),
      );
      if (!permissions.length && !groups.length && !hasDynamicGroups) {
        throw new Error(`${name} must declare explicit permission metadata`);
      }
    }
  });

  it.each(saleOrderRouteEndpoints)("$name rejects actors missing any required permission", async ({ handler }) => {
    const { permissions, groups } = endpointPermissions(handler);
    const guard = new PermissionsGuard(
      new Reflector(),
      { getEffectivePermissions: jest.fn().mockResolvedValue([]) } as unknown as AccessControlService,
    );
    await expect(guard.canActivate(contextFor(handler, SaleOrdersController))).rejects.toBeInstanceOf(ForbiddenException);

    const completeSet = [...permissions, ...groups.map((group) => group[0])];
    const accessControl = { getEffectivePermissions: jest.fn().mockResolvedValue(completeSet) };
    const authorizedGuard = new PermissionsGuard(new Reflector(), accessControl as unknown as AccessControlService);
    await expect(authorizedGuard.canActivate(contextFor(handler, SaleOrdersController))).resolves.toBe(true);

    for (const missingPermission of permissions) {
      accessControl.getEffectivePermissions.mockResolvedValue([
        ...permissions.filter((permission) => permission !== missingPermission),
        ...groups.map((group) => group[0]),
      ]);
      await expect(authorizedGuard.canActivate(contextFor(handler, SaleOrdersController))).rejects.toBeInstanceOf(ForbiddenException);
    }

    accessControl.getEffectivePermissions.mockResolvedValue(["*"]);
    await expect(authorizedGuard.canActivate(contextFor(handler, SaleOrdersController))).resolves.toBe(true);
  });

  it.each([
    { name: "bulkExecuteWorkflow", body: { mode: "state" }, group: ["sale_orders.change_state"] },
    { name: "bulkExecuteWorkflow", body: { mode: "global_action" }, group: ["sale_orders.execute_workflow_action"] },
    { name: "bulkSetSaleOrdersActive", body: { isActive: false }, group: ["sale_orders.delete"] },
    { name: "bulkSetSaleOrdersActive", body: { isActive: true }, group: ["sale_orders.view_deleted"], secondGroup: ["sale_orders.restore"] },
    { name: "setSaleOrderActive", body: { isActive: false }, group: ["sale_orders.delete"] },
    { name: "setSaleOrderActive", body: { isActive: true }, group: ["sale_orders.view_deleted"], secondGroup: ["sale_orders.restore"] },
  ])("$name resolves the correct dynamic permission group for $body", async ({ name, body, group, secondGroup }) => {
    const handler = (SaleOrdersController.prototype as unknown as Record<string, (...args: never[]) => unknown>)[name];
    request.body = body;
    const resolved = endpointPermissions(handler);
    expect(resolved.groups).toContainEqual(group);
    if (secondGroup) expect(resolved.groups).toContainEqual(secondGroup);

    const required = { getEffectivePermissions: jest.fn().mockResolvedValue([]) };
    const guard = new PermissionsGuard(new Reflector(), required as unknown as AccessControlService);
    await expect(guard.canActivate(contextFor(handler, SaleOrdersController))).rejects.toBeInstanceOf(ForbiddenException);
    required.getEffectivePermissions.mockResolvedValue(group);
    if (secondGroup) {
      await expect(guard.canActivate(contextFor(handler, SaleOrdersController))).rejects.toBeInstanceOf(ForbiddenException);
      required.getEffectivePermissions.mockResolvedValue([...group, ...secondGroup]);
    }
    await expect(guard.canActivate(contextFor(handler, SaleOrdersController))).resolves.toBe(true);
    request.body = {};
  });
});

const adjacentFinancialControllers: Array<{
  name: string;
  controller: PermissionMatrixController;
  endpoints: IncomeEndpoint[];
}> = [
  {
    name: "CompanyPaymentAccountsController",
    controller: CompanyPaymentAccountsController,
    endpoints: discoverHttpEndpoints(CompanyPaymentAccountsController),
  },
  {
    name: "AdminFinanceController",
    controller: AdminFinanceController,
    endpoints: discoverHttpEndpoints(AdminFinanceController),
  },
];

describe.each(adjacentFinancialControllers)("$name financial permission matrix", ({ controller, endpoints }) => {
  it("discovers every HTTP route and requires explicit permission metadata", () => {
    expect(endpoints.length).toBeGreaterThan(0);
    for (const { name, handler } of endpoints) {
      const { permissions, groups } = endpointPermissions(handler);
      const hasDynamicGroups = Boolean(Reflect.getMetadata(DYNAMIC_PERMISSION_GROUPS_KEY, handler));
      if (!permissions.length && !groups.length && !hasDynamicGroups) {
        throw new Error(`${name} must declare explicit permission metadata`);
      }
    }
  });

  it.each(endpoints)("$name denies missing access and accepts required permissions or global admin", async ({ handler }) => {
    const { permissions, groups } = endpointPermissions(handler);
    const accessControl = { getEffectivePermissions: jest.fn().mockResolvedValue([]) };
    const guard = new PermissionsGuard(new Reflector(), accessControl as unknown as AccessControlService);
    await expect(guard.canActivate(contextFor(handler, controller))).rejects.toBeInstanceOf(ForbiddenException);

    accessControl.getEffectivePermissions.mockResolvedValue([
      ...permissions,
      ...groups.map((group) => group[0]),
    ]);
    await expect(guard.canActivate(contextFor(handler, controller))).resolves.toBe(true);

    accessControl.getEffectivePermissions.mockResolvedValue(["*"]);
    await expect(guard.canActivate(contextFor(handler, controller))).resolves.toBe(true);
  });
});

describe("financial endpoint permission catalog", () => {
  const controllers: Array<{ name: string; controller: PermissionMatrixController; endpoints: IncomeEndpoint[] }> = [
    { name: "IncomeController", controller: IncomeController, endpoints: discoverHttpEndpoints(IncomeController) },
    { name: "SaleOrdersController", controller: SaleOrdersController, endpoints: saleOrderRouteEndpoints },
    ...adjacentFinancialControllers,
  ];

  it("seeds every permission required by financial HTTP routes, including dynamic branches", () => {
    const seeded = new Set(PERMISSIONS_SEED.map(({ code }) => code));
    const branches = [
      {},
      { mode: "state" },
      { mode: "global_action" },
      { isActive: false },
      { isActive: true },
    ];
    const missing = new Set<string>();
    const originalBody = request.body;

    try {
      for (const { name: controllerName, endpoints } of controllers) {
        for (const { name, handler } of endpoints) {
          for (const body of branches) {
            request.body = body;
            const { permissions, groups } = endpointPermissions(handler);
            for (const code of [...permissions, ...groups.flat()]) {
              if (!seeded.has(code)) missing.add(`${controllerName}.${name}: ${code}`);
            }
          }
        }
      }
    } finally {
      request.body = originalBody;
    }

    expect([...missing]).toEqual([]);
  });
});
