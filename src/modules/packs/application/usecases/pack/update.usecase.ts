import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PACK_REPOSITORY, PackRepository } from "src/modules/packs/domain/ports/pack.repository";
import { PACK_ITEM_REPOSITORY, PackItemRepository } from "src/modules/packs/domain/ports/pack-item.repository";
import { PackFactory } from "src/modules/packs/domain/factories/pack.factory";
import { PackId } from "src/modules/packs/domain/value-objects/pack-id.vo";

export type PackItemReplaceInput = {
  id?: string;
  skuId: string;
  quantity: number;
  price: number;
};

export class UpdatePackUsecase {
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
    packId: string;
    description?: string;
    total: number;
    itemsReplace: PackItemReplaceInput[];
  }): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const current = await this.packRepo.findById(input.packId, tx);
      if (!current) {
        throw new NotFoundException("Pack no encontrado");
      }

      const itemsReplace = Array.isArray(input.itemsReplace) ? input.itemsReplace : [];
      if (!itemsReplace.length) {
        throw new BadRequestException("Debes enviar al menos un item");
      }

      const skuIds = itemsReplace.map((item) => item.skuId?.trim()).filter(Boolean) as string[];
      const uniqueSkuIds = new Set(skuIds);
      if (uniqueSkuIds.size !== skuIds.length) {
        throw new BadRequestException("No se puede repetir un SKU");
      }

      const computedCents = this.computeTotalCents(itemsReplace);
      const inputTotalCents = this.toCents(input.total);
      if (computedCents !== inputTotalCents) {
        throw new BadRequestException("El total no coincide con la suma de items");
      }

      const currentItems = await this.itemRepo.listByPackId(current.packId.value, tx);
      const currentById = new Map(currentItems.map((i) => [i.id, i]));

      const incomingExistingIds = new Set(
        itemsReplace.map((i) => i.id?.trim()).filter(Boolean) as string[],
      );

      const idsToDelete = currentItems
        .map((i) => i.id)
        .filter((id) => !incomingExistingIds.has(id));

      if (idsToDelete.length) {
        await this.itemRepo.deleteByIds(idsToDelete, tx);
      }

      const updates: Array<{ id: string; quantity: number; price: number }> = [];
      const inserts = itemsReplace.filter((i) => !i.id);

      for (const item of itemsReplace) {
        if (!item.id) continue;
        const existing = currentById.get(item.id);
        if (!existing) {
          throw new BadRequestException("Item invalido");
        }

        const incomingSkuId = item.skuId?.trim();
        if (!incomingSkuId) {
          throw new BadRequestException("Sku invalido");
        }

        if (existing.skuId !== incomingSkuId) {
          throw new BadRequestException("No se permite cambiar el SKU de un item existente");
        }

        const qtyCents = Math.round((item.quantity ?? 0) * 100);
        const priceCents = Math.round((item.price ?? 0) * 100);
        if (!(qtyCents > 0)) {
          throw new BadRequestException("Cantidad invalida");
        }
        if (priceCents < 0) {
          throw new BadRequestException("Precio invalido");
        }

        const existingQtyCents = Math.round((existing.quantity ?? 0) * 100);
        const existingPriceCents = Math.round((existing.price ?? 0) * 100);

        if (qtyCents !== existingQtyCents || priceCents !== existingPriceCents) {
          updates.push({ id: item.id, quantity: item.quantity, price: item.price });
        }
      }

      if (updates.length) {
        await this.itemRepo.updateMany(updates, tx);
      }

      if (inserts.length) {
        const packId = new PackId(current.packId.value);
        const newItems = inserts.map((i) =>
          PackFactory.createPackItem({
            packId,
            skuId: i.skuId,
            quantity: i.quantity,
            price: i.price,
          }),
        );
        await this.itemRepo.createMany(newItems, tx);
      }

      const next = PackFactory.createPack({
        packId: new PackId(current.packId.value),
        description: input.description ?? current.description,
        total: input.total,
        isActive: current.isActive,
        createdAt: current.createdAt,
        updatedAt: this.clock.now(),
      });

      await this.packRepo.update(next, tx);

      return { message: "Pack actualizado con exito" };
    });
  }

  private toCents(value: number): number {
    return Math.round((value ?? 0) * 100);
  }

  private computeTotalCents(items: Array<{ quantity: number; price: number }>): number {
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
