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
}
