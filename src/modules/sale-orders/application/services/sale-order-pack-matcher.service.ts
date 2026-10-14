import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  PACK_REPOSITORY,
  PackCompositionItem,
  PackRepository,
  PackWithItems,
} from 'src/modules/packs/domain/ports/pack.repository';
import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import {
  fromMinorUnits,
  toMinorUnits,
} from 'src/modules/sale-orders/domain/value-objects/money';

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
        const consumedQuantityHundredths = pack.items.reduce(
          (sum, item) =>
            sum + BigInt(toMinorUnits(Number(item.quantity))) * BigInt(packQuantity),
          0n,
        );
        return { pack, packQuantity, consumedQuantityHundredths };
      })
      .filter((candidate) => candidate.packQuantity > 0)
      .sort(
        (left, right) =>
          (right.consumedQuantityHundredths > left.consumedQuantityHundredths
            ? 1
            : right.consumedQuantityHundredths < left.consumedQuantityHundredths
              ? -1
              : 0) ||
          right.pack.items.length - left.pack.items.length,
      );

    if (!ranked.length) {
      return { status: 'NONE', composition, matches: [] };
    }

    const best = ranked[0];
    const tied = ranked.filter(
      (candidate) =>
        candidate.consumedQuantityHundredths === best.consumedQuantityHundredths &&
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
        this.toSafeQuantityHundredths(
          BigInt(toMinorUnits(Number(item.quantity))) * BigInt(best.packQuantity),
        ),
      ]),
    );
    const leftovers = composition
      .map((component) => ({
        skuId: component.skuId,
        quantity: fromMinorUnits(
          toMinorUnits(component.quantity) -
            (consumedBySkuId.get(component.skuId) ?? 0),
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
      .map(([skuId, quantity]) => ({ skuId, quantity: fromMinorUnits(toMinorUnits(quantity)) }))
      .filter((component) => component.quantity > 0)
      .sort((left, right) => left.skuId.localeCompare(right.skuId));
  }

  private getMaximumPackQuantity(
    composition: PackCompositionItem[],
    pack: PackWithItems,
  ): number {
    const availableBySkuId = new Map(
      composition.map((component) => [component.skuId, toMinorUnits(component.quantity)]),
    );
    if (pack.items.length === 0) return 0;

    let maximumPackQuantity: bigint | null = null;
    for (const item of pack.items) {
      const packItemQuantityHundredths = toMinorUnits(Number(item.quantity));
      if (packItemQuantityHundredths <= 0) {
        throw new BadRequestException('La cantidad de un componente del pack debe ser mayor que cero');
      }
      const availableQuantityHundredths = BigInt(
        availableBySkuId.get(item.skuId) ?? 0,
      );
      const packCount =
        availableQuantityHundredths / BigInt(packItemQuantityHundredths);
      maximumPackQuantity =
        maximumPackQuantity === null || packCount < maximumPackQuantity
          ? packCount
          : maximumPackQuantity;
    }

    const result = maximumPackQuantity ?? 0n;
    if (result > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new BadRequestException('La cantidad de packs esta fuera del rango permitido');
    }
    return Number(result);
  }

  private toSafeQuantityHundredths(value: bigint): number {
    if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
      throw new BadRequestException('La cantidad de componentes esta fuera del rango permitido');
    }
    return Number(value);
  }
}
