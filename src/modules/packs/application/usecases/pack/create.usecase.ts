import { BadRequestException, Inject } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PackFactory } from "src/modules/packs/domain/factories/pack.factory";
import { DuplicatePackItemSkuError } from "src/modules/packs/domain/errors/duplicate-pack-item-sku.error";
import { PackTotalMismatchError } from "src/modules/packs/domain/errors/pack-total-mismatch.error";
import { PACK_REPOSITORY, PackRepository } from "src/modules/packs/domain/ports/pack.repository";
import {
  PACK_ITEM_REPOSITORY,
  PackItemRepository,
} from "src/modules/packs/domain/ports/pack-item.repository";
type CreatePackItemInput = { skuId: string; quantity: number; price: number };

export class CreatePackUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PACK_REPOSITORY)
    private readonly packRepo: PackRepository,
    @Inject(PACK_ITEM_REPOSITORY)
    private readonly itemRepo: PackItemRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: {
    description: string;
    total: number;
    items: CreatePackItemInput[];
    isActive?: boolean;
  }): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      if (!input.items?.length) {
        throw new BadRequestException("Debes enviar al menos un item");
      }

      const skuIds = input.items.map((item) => item.skuId?.trim()).filter(Boolean) as string[];
      const uniqueSkuIds = new Set(skuIds);
      if (uniqueSkuIds.size !== skuIds.length) {
        throw new BadRequestException(new DuplicatePackItemSkuError().message);
      }

      const computedCents = this.computeTotalCents(input.items);
      const inputTotalCents = this.toCents(input.total);
      if (computedCents !== inputTotalCents) {
        throw new BadRequestException(new PackTotalMismatchError().message);
      }

      const pack = PackFactory.createPack({
        description: input.description,
        total: input.total,
        isActive: input.isActive ?? true,
        createdAt: this.clock.now(),
      });

      const items = input.items.map((i) =>
        PackFactory.createPackItem({
          packId: pack.packId,
          skuId: i.skuId,
          quantity: i.quantity,
          price: i.price,
        }),
      );

      await this.packRepo.create(pack, tx);
      await this.itemRepo.createMany(items, tx);

      return { message: "Pack creado con exito" };
    });
  }

  private toCents(value: number): number {
    return Math.round((value ?? 0) * 100);
  }

  private computeTotalCents(items: CreatePackItemInput[]): number {
    let totalCents = 0;
    for (const item of items) {
      const qtyCents = Math.round((item.quantity ?? 0) * 100);
      const priceCents = Math.round((item.price ?? 0) * 100);
      const lineCents = Math.round((qtyCents * priceCents) / 100);
      totalCents += lineCents;
    }
    return totalCents;
  }
}
