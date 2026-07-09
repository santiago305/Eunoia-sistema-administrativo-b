import { ClientType } from "src/modules/clients/domain/object-values/client-type";
import { GetSaleOrderSearchStateUsecase } from "./get-state.usecase";

describe("GetSaleOrderSearchStateUsecase", () => {
  it("returns bank account and client type catalogs", async () => {
    const repo = {
      listState: jest.fn().mockResolvedValue({
        recent: [],
        metrics: [],
        clients: [],
        warehouses: [],
        workflows: [],
        states: [],
        bankAccounts: [{ bankAccountId: "bank-1", label: "BCP Soles" }],
      }),
    };
    const usecase = new GetSaleOrderSearchStateUsecase(repo as any);

    const result = await usecase.execute("user-1");

    expect(result.catalogs.bankAccounts).toEqual([{ id: "bank-1", label: "BCP Soles" }]);
    expect(result.catalogs.clientTypes).toEqual([
      { id: ClientType.NEW, label: "Nuevo", keywords: ["nuevo"] },
      { id: ClientType.LAGGING, label: "Rezagado", keywords: ["rezagado"] },
      { id: ClientType.REPURCHASE, label: "Recompra", keywords: ["recompra"] },
      { id: ClientType.UNDEFINED, label: "Sin definir", keywords: ["sin definir"] },
    ]);
  });

  it("returns creator and assignee catalogs and uses them in labels", async () => {
    const repo = {
      listState: jest.fn().mockResolvedValue({
        recent: [
          {
            recentId: "recent-1",
            snapshot: {
              filters: [
                { field: "createdBy", operator: "in", values: ["user-1"] },
                { field: "assignedBy", operator: "in", values: ["user-2"] },
              ],
            },
            lastUsedAt: new Date("2026-07-08T00:00:00.000Z"),
          },
        ],
        metrics: [],
        clients: [],
        warehouses: [],
        workflows: [],
        states: [],
        bankAccounts: [],
        creators: [{ userId: "user-1", label: "Santiago (s@test.com)" }],
        assignees: [{ userId: "user-2", label: "Ana (a@test.com)" }],
      }),
    };
    const usecase = new GetSaleOrderSearchStateUsecase(repo as any);

    const result = await usecase.execute("user-1");

    expect(result.catalogs.creators).toEqual([
      { id: "user-1", label: "Santiago (s@test.com)" },
    ]);
    expect(result.catalogs.assignees).toEqual([
      { id: "user-2", label: "Ana (a@test.com)" },
    ]);
    expect(result.recent[0].label).toBe(
      "Creado por: Santiago (s@test.com) | Asignado a: Ana (a@test.com)",
    );
  });
});
