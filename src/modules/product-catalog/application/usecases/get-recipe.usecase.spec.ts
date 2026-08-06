import { GetProductCatalogRecipe } from "./get-recipe.usecase";

describe("GetProductCatalogRecipe", () => {
  it("enriches all recipe ingredients with their material SKU in one batch", async () => {
    const recipeRepo = {
      findActiveBySkuId: jest.fn().mockResolvedValue({
        recipe: { id: "recipe-1", skuId: "product-sku" },
        items: [
          { id: "item-1", recipeId: "recipe-1", materialSkuId: "material-1", quantity: 10, unitId: "unit-1" },
          { id: "item-2", recipeId: "recipe-1", materialSkuId: "material-2", quantity: 5, unitId: "unit-2" },
        ],
      }),
    };
    const materialOne = {
      sku: { id: "material-1", name: "Arcilla", backendSku: "00001", isActive: true },
      unit: { id: "unit-1", name: "GRAMOS", code: "GRM" },
      attributes: [{ code: "color", name: "Color", value: "Rosada" }],
    };
    const materialTwo = {
      sku: { id: "material-2", name: "Bolsa", backendSku: "00002", isActive: false },
      unit: { id: "unit-2", name: "UNIDADES", code: "NIU" },
      attributes: [],
    };
    const skuRepo = { findByIds: jest.fn().mockResolvedValue([materialOne, materialTwo]) };
    const usecase = new GetProductCatalogRecipe(recipeRepo as any, skuRepo as any);

    const result = await usecase.execute("product-sku");

    expect(skuRepo.findByIds).toHaveBeenCalledTimes(1);
    expect(skuRepo.findByIds).toHaveBeenCalledWith(["material-1", "material-2"]);
    expect(result.items).toEqual([
      expect.objectContaining({ materialSkuId: "material-1", materialSku: materialOne }),
      expect.objectContaining({ materialSkuId: "material-2", materialSku: materialTwo }),
    ]);
  });
});
