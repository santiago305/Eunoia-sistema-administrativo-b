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
});
