import { ConflictException } from "@nestjs/common";
import { ProductCatalogProductType } from "../../domain/value-objects/product-type";
import { UpdateProductCatalogProduct } from "./update-product.usecase";

describe("UpdateProductCatalogProduct", () => {
  const product = {
    id: "product-1",
    name: "Arcilla",
    description: null,
    type: ProductCatalogProductType.MATERIAL,
    brand: null,
    baseUnitId: "unit-gram",
    isActive: true,
    isDeleted: false,
  };

  const createUseCase = (equivalences: unknown[] = []) => {
    const repo = {
      findById: jest.fn().mockResolvedValue(product),
      update: jest.fn().mockResolvedValue(product),
    };
    const equivalenceRepo = {
      listByProductId: jest.fn().mockResolvedValue(equivalences),
    };
    const useCase = new UpdateProductCatalogProduct(
      repo as any,
      {} as any,
      equivalenceRepo as any,
      {} as any,
      {} as any,
    );

    return { useCase, repo, equivalenceRepo };
  };

  it("blocks changing the base unit when equivalences exist", async () => {
    const { useCase, repo } = createUseCase([{ id: "equivalence-1" }]);

    await expect(useCase.execute(product.id, { baseUnitId: "unit-kilogram" })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("allows keeping the same base unit without querying equivalences", async () => {
    const { useCase, repo, equivalenceRepo } = createUseCase([{ id: "equivalence-1" }]);

    await useCase.execute(product.id, { baseUnitId: product.baseUnitId });

    expect(equivalenceRepo.listByProductId).not.toHaveBeenCalled();
    expect(repo.update).toHaveBeenCalled();
  });

  it("allows changing the base unit when no equivalences exist", async () => {
    const { useCase, repo } = createUseCase();

    await useCase.execute(product.id, { baseUnitId: "unit-kilogram" });

    expect(repo.update).toHaveBeenCalledWith(product.id, { baseUnitId: "unit-kilogram" });
  });
});
