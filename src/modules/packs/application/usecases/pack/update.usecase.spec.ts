import { UpdatePackUsecase } from "./update.usecase";

describe("UpdatePackUsecase", () => {
  it("deletes missing items, updates only changed ones, and inserts new items", async () => {
    const uow = { runInTransaction: (fn: any) => fn({}) } as any;
    const packRepo = {
      findById: jest.fn().mockResolvedValue({
        packId: { value: "pack-1" },
        description: "Pack",
        total: 6,
        isActive: true,
        createdAt: new Date("2026-01-01"),
      }),
      update: jest.fn().mockResolvedValue(undefined),
    } as any;

    const itemRepo = {
      listByPackId: jest.fn().mockResolvedValue([
        { id: "a", skuId: "s1", quantity: 1, price: 1 },
        { id: "b", skuId: "s2", quantity: 1, price: 2 },
        { id: "c", skuId: "s3", quantity: 1, price: 3 },
      ]),
      deleteByIds: jest.fn().mockResolvedValue(undefined),
      updateMany: jest.fn().mockResolvedValue(undefined),
      createMany: jest.fn().mockResolvedValue(undefined),
    } as any;

    const clock = { now: () => new Date("2026-01-02") } as any;

    const usecase = new UpdatePackUsecase(uow, packRepo, itemRepo, clock);

    await usecase.execute({
      packId: "pack-1",
      description: "Pack editado",
      total: 9,
      itemsReplace: [
        { id: "a", skuId: "s1", quantity: 1, price: 1 }, // unchanged
        { id: "b", skuId: "s2", quantity: 2, price: 2 }, // changed qty
        { skuId: "s4", quantity: 1, price: 4 }, // new
      ],
    });

    expect(itemRepo.deleteByIds).toHaveBeenCalledWith(["c"], expect.anything());
    expect(itemRepo.updateMany).toHaveBeenCalledWith([{ id: "b", quantity: 2, price: 2 }], expect.anything());
    expect(itemRepo.createMany).toHaveBeenCalledTimes(1);
    expect(packRepo.update).toHaveBeenCalledTimes(1);
  });
});

