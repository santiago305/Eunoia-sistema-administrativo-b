import { PurchaseOrderOutputMapper } from "../../mappers/purchase-order-output.mapper";
import { ListPurchaseOrdersUsecase } from "./list.usecase";

describe("ListPurchaseOrdersUsecase", () => {
  it("adds at most two item summaries using one batch request", async () => {
    const orders = [{ poId: "po-1" }, { poId: "po-2" }];
    const purchaseRepo = {
      list: jest.fn().mockResolvedValue({
        items: orders.map((order) => ({ order, totalPaid: 0 })),
        total: 2,
      }),
    };
    const summaries = new Map([
      ["po-1", { total: 3, items: [
        { skuId: "sku-1", name: "Jabon", attributeName: "Variante", attributeValue: "Curcuma" },
        { skuId: "sku-2", name: "Jabon", attributeName: "Variante", attributeValue: "Azufre" },
      ] }],
      ["po-2", { total: 0, items: [] }],
    ]);
    const itemRepo = { getSummariesByPurchaseIds: jest.fn().mockResolvedValue(summaries) };
    const searchRepo = { touchRecentSearch: jest.fn() };
    const accessControl = { userHasAllPermissions: jest.fn().mockResolvedValue(false) };
    jest.spyOn(PurchaseOrderOutputMapper, "toOrderOutput").mockImplementation((order: any) => ({
      poId: order.poId,
      supplierId: "supplier",
      status: "DRAFT" as any,
      creditDays: 0,
      numQuotas: 0,
      totalTaxed: 0,
      totalExempted: 0,
      totalIgv: 0,
      purchaseValue: 0,
      isActive: true,
    }));
    const usecase = new ListPurchaseOrdersUsecase(
      purchaseRepo as any,
      itemRepo as any,
      searchRepo as any,
      accessControl as any,
    );

    const result = await usecase.execute({ page: 1, limit: 25 });

    expect(itemRepo.getSummariesByPurchaseIds).toHaveBeenCalledTimes(1);
    expect(itemRepo.getSummariesByPurchaseIds).toHaveBeenCalledWith(["po-1", "po-2"], 2);
    expect(result.items[0].itemSummary).toEqual(summaries.get("po-1"));
    expect(result.items[1].itemSummary).toEqual({ total: 0, items: [] });
  });
});
