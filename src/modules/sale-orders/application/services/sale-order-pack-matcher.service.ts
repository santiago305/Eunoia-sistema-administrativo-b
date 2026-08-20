import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  PACK_REPOSITORY,
  PackCompositionItem,
  PackRepository,
  PackWithItems,
} from 'src/modules/packs/domain/ports/pack.repository';
import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';

export type SaleOrderPackMatchResult =
  | {
      status: 'NONE';
      composition: PackCompositionItem[];
      matches: [];
    }
  | {
      status: 'UNIQUE';
      composition: PackCompositionItem[];
      pack: PackWithItems;
      matches: [PackWithItems];
    }
  | {
      status: 'AMBIGUOUS';
      composition: PackCompositionItem[];
      matches: PackWithItems[];
    };

export type SaleOrderPackDecompositionResult =
  | {
      status: 'NONE';
      composition: PackCompositionItem[];
      matches: [];
    }
  | {
      status: 'UNIQUE';
      composition: PackCompositionItem[];
      pack: PackWithItems;
      packQuantity: number;
      leftovers: PackCompositionItem[];
      matches: [PackWithItems];
    }
  | {
      status: 'AMBIGUOUS';
      composition: PackCompositionItem[];
      matches: PackWithItems[];
    };

@Injectable()
export class SaleOrderPackMatcherService {
  constructor(
    @Inject(PACK_REPOSITORY)
    private readonly packRepo: PackRepository,
  ) {}

  async match(
    input: PackCompositionItem[],
    tx?: TransactionContext,
  ): Promise<SaleOrderPackMatchResult> {
    const composition = this.normalize(input);

    if (composition.length < 2) {
      return { status: 'NONE', composition, matches: [] };
    }

    const matches = (
      await this.packRepo.findActiveByExactComposition(composition, tx)
    ).filter((match) => match.pack.isActive);

    if (matches.length === 0) {
      return { status: 'NONE', composition, matches: [] };
    }

    if (matches.length === 1) {
      return {
        status: 'UNIQUE',
        composition,
        pack: matches[0],
        matches: [matches[0]],
      };
    }

    return { status: 'AMBIGUOUS', composition, matches };
  }

  async decompose(
    input: PackCompositionItem[],
    tx?: TransactionContext,
  ): Promise<SaleOrderPackDecompositionResult> {
    const composition = this.normalize(input);
    if (composition.length < 2) {
      return { status: 'NONE', composition, matches: [] };
    }

    const exactMatches = (
      await this.packRepo.findActiveByExactComposition(composition, tx)
    ).filter((candidate) => candidate.pack.isActive);
    if (exactMatches.length === 1) {
      return {
        status: 'UNIQUE',
        composition,
        pack: exactMatches[0],
        packQuantity: 1,
        leftovers: [],
        matches: [exactMatches[0]],
      };
    }
    if (exactMatches.length > 1) {
      return { status: 'AMBIGUOUS', composition, matches: exactMatches };
    }

    const candidates = (
      await this.packRepo.findActiveContainedInComposition(composition, tx)
    ).filter((candidate) => candidate.pack.isActive);
    if (!candidates.length) {
      return { status: 'NONE', composition, matches: [] };
    }

    const ranked = candidates
      .map((pack) => {
        const packQuantity = this.getMaximumPackQuantity(composition, pack);
        const consumedQuantity = pack.items.reduce(
          (sum, item) => sum + Number(item.quantity) * packQuantity,
          0,
        );
        return { pack, packQuantity, consumedQuantity };
      })
      .filter((candidate) => candidate.packQuantity > 0)
      .sort(
        (left, right) =>
          right.consumedQuantity - left.consumedQuantity ||
          right.pack.items.length - left.pack.items.length,
      );

    if (!ranked.length) {
      return { status: 'NONE', composition, matches: [] };
    }

    const best = ranked[0];
    const tied = ranked.filter(
      (candidate) =>
        candidate.consumedQuantity === best.consumedQuantity &&
        candidate.pack.items.length === best.pack.items.length,
    );
    if (tied.length > 1) {
      return {
        status: 'AMBIGUOUS',
        composition,
        matches: tied.map((candidate) => candidate.pack),
      };
    }

    const consumedBySkuId = new Map(
      best.pack.items.map((item) => [
        item.skuId,
        this.roundQuantity(Number(item.quantity) * best.packQuantity),
      ]),
    );
    const leftovers = composition
      .map((component) => ({
        skuId: component.skuId,
        quantity: this.roundQuantity(
          component.quantity -
            Number(consumedBySkuId.get(component.skuId) ?? 0),
        ),
      }))
      .filter((component) => component.quantity > 0);

    return {
      status: 'UNIQUE',
      composition,
      pack: best.pack,
      packQuantity: best.packQuantity,
      leftovers,
      matches: [best.pack],
    };
  }

  normalize(input: PackCompositionItem[]): PackCompositionItem[] {
    if (!Array.isArray(input)) {
      throw new BadRequestException('La composicion del pack es invalida');
    }

    const quantityBySkuId = new Map<string, number>();

    for (const component of input) {
      const skuId = component?.skuId?.trim();
      const quantity = Number(component?.quantity);

      if (!skuId) {
        throw new BadRequestException('Cada componente debe incluir un SKU');
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new BadRequestException(
          'Cada componente debe incluir una cantidad mayor que cero',
        );
      }

      quantityBySkuId.set(skuId, (quantityBySkuId.get(skuId) ?? 0) + quantity);
    }

    return [...quantityBySkuId.entries()]
      .map(([skuId, quantity]) => ({
        skuId,
        quantity: this.roundQuantity(quantity),
      }))
      .filter((component) => component.quantity > 0)
      .sort((left, right) => left.skuId.localeCompare(right.skuId));
  }

  private roundQuantity(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private getMaximumPackQuantity(
    composition: PackCompositionItem[],
    pack: PackWithItems,
  ): number {
    const availableBySkuId = new Map(
      composition.map((component) => [component.skuId, component.quantity]),
    );
    return Math.min(
      ...pack.items.map((item) =>
        Math.floor(
          Number(availableBySkuId.get(item.skuId) ?? 0) /
            Number(item.quantity),
        ),
      ),
    );
  }
}
