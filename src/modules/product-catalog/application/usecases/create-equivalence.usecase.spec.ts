import { BadRequestException, ConflictException } from "@nestjs/common";
import { CreateProductCatalogEquivalence } from "./create-equivalence.usecase";

describe("CreateProductCatalogEquivalence", () => {
  const input = {
    productId: "product-1",
    fromUnitId: "unit-gram",
    toUnitId: "unit-kilogram",
    factor: 0.001,
  };

  const createUseCase = () => {
    const productRepo = { findById: jest.fn().mockResolvedValue({ id: input.productId }) };
    const unitRepo = { findById: jest.fn().mockResolvedValue({ id: input.fromUnitId }) };
    const equivalenceRepo = {
      findByProductAndUnits: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async (equivalence) => equivalence),
    };
    return {
      useCase: new CreateProductCatalogEquivalence(productRepo as any, unitRepo as any, equivalenceRepo as any),
      equivalenceRepo,
    };
  };

  it("persists the declared direction: destination quantity equals origin quantity times factor", async () => {
    const { useCase, equivalenceRepo } = createUseCase();

    await useCase.execute(input);

    expect(equivalenceRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: input.productId,
        fromUnitId: input.fromUnitId,
        toUnitId: input.toUnitId,
        factor: 0.001,
      }),
    );
  });

  it("rejects a non-positive factor or identical units before querying persistence", async () => {
    const { useCase, equivalenceRepo } = createUseCase();

    await expect(useCase.execute({ ...input, factor: 0 })).rejects.toThrow(BadRequestException);
    await expect(useCase.execute({ ...input, toUnitId: input.fromUnitId })).rejects.toThrow(BadRequestException);

    expect(equivalenceRepo.findByProductAndUnits).not.toHaveBeenCalled();
  });

  it("returns a conflict for an existing product and unit direction", async () => {
    const { useCase, equivalenceRepo } = createUseCase();
    equivalenceRepo.findByProductAndUnits.mockResolvedValue({ id: "equivalence-1" });

    await expect(useCase.execute(input)).rejects.toThrow(ConflictException);
    expect(equivalenceRepo.create).not.toHaveBeenCalled();
  });
});
