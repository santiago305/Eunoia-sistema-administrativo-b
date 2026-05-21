import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { PACK_REPOSITORY } from "src/modules/packs/domain/ports/pack.repository";
import { GetPackUsecase } from "./get-by-id.usecase";
import { Pack } from "src/modules/packs/domain/entities/pack";

describe("GetPackUsecase", () => {
  it("returns pack details including sku info", async () => {
    const repo = {
      findByIdWithItems: jest.fn().mockResolvedValue({
        pack: Pack.create({ description: "Pack 1", total: 20, isActive: true }),
        items: [
          {
            id: "item-1",
            skuId: "sku-1",
            quantity: 1,
            price: 20,
            lineTotal: 20,
            sku: { id: "sku-1", backendSku: "00001", name: "SKU 1", price: 99, isActive: true },
          },
        ],
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        GetPackUsecase,
        { provide: PACK_REPOSITORY, useValue: repo },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(GetPackUsecase);
      const result = await usecase.execute({ packId: "pack-1" });
      expect(result).toEqual(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              sku: expect.objectContaining({ name: "SKU 1" }),
            }),
          ],
        }),
      );
    } finally {
      await moduleRef.close();
    }
  });
});

