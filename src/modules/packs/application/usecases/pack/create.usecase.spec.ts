import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { CLOCK } from "src/shared/application/ports/clock.port";
import { PACK_REPOSITORY } from "src/modules/packs/domain/ports/pack.repository";
import { PACK_ITEM_REPOSITORY } from "src/modules/packs/domain/ports/pack-item.repository";
import { CreatePackUsecase } from "./create.usecase";

describe("CreatePackUsecase", () => {
  it("rejects when total does not match computed items total", async () => {
    const packRepo = { create: jest.fn() };
    const itemRepo = { createMany: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreatePackUsecase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work({}) } },
        { provide: CLOCK, useValue: { now: () => new Date("2026-05-19T00:00:00.000Z") } },
        { provide: PACK_REPOSITORY, useValue: packRepo },
        { provide: PACK_ITEM_REPOSITORY, useValue: itemRepo },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(CreatePackUsecase);
      await expect(
        usecase.execute({
          description: "Pack test",
          total: 10,
          items: [{ skuId: "sku-1", quantity: 1, price: 20 }],
          isActive: true,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(packRepo.create).not.toHaveBeenCalled();
      expect(itemRepo.createMany).not.toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });
});

