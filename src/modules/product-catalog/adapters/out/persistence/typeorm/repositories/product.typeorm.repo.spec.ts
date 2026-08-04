import { ProductCatalogProduct } from "src/modules/product-catalog/domain/entities/product";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import { ProductCatalogProductTypeormRepository } from "./product.typeorm.repo";

describe("ProductCatalogProductTypeormRepository", () => {
  it("checks deleted products by both name and type before creating", async () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    const typeormRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      save: jest.fn().mockResolvedValue({
        id: "material-1",
        name: "Jabon",
        description: null,
        type: ProductCatalogProductType.MATERIAL,
        brand: null,
        baseUnitId: null,
        isActive: true,
        isDeleted: false,
      }),
    };
    const repository = new ProductCatalogProductTypeormRepository(
      typeormRepo as any,
    );

    await repository.create(
      new ProductCatalogProduct(
        undefined,
        "Jabon",
        null,
        ProductCatalogProductType.MATERIAL,
        null,
        null,
        true,
      ),
    );

    expect(queryBuilder.where).toHaveBeenCalledWith("product.type = :type", {
      type: ProductCatalogProductType.MATERIAL,
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      "normalize_product_name(product.name) = :normalizedName",
      { normalizedName: "jabon" },
    );
    expect(typeormRepo.save).toHaveBeenCalledWith({
      name: "Jabon",
      description: null,
      type: ProductCatalogProductType.MATERIAL,
      brand: null,
      baseUnitId: null,
      isActive: true,
      isDeleted: false,
    });
  });

  it("finds a product only inside the requested catalog type", async () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    const typeormRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const repository = new ProductCatalogProductTypeormRepository(
      typeormRepo as any,
    );

    await repository.findByNameAndType(
      "  Jabon  ",
      ProductCatalogProductType.PRODUCT,
    );

    expect(queryBuilder.where).toHaveBeenCalledWith("product.type = :type", {
      type: ProductCatalogProductType.PRODUCT,
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      "normalize_product_name(product.name) = :normalizedName",
      { normalizedName: "jabon" },
    );
  });
});
