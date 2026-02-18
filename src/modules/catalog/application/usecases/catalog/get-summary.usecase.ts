import { Inject } from '@nestjs/common';
import { PRODUCT_REPOSITORY, ProductRepository } from '../../../domain/ports/product.repository';
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from '../../../domain/ports/product-variant.repository';

type MonthSeries = { month: string; count: number };

export class GetCatalogSummary {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
    @Inject(PRODUCT_VARIANT_REPOSITORY) private readonly variantRepo: ProductVariantRepository,
  ) {}

  async execute() {
    const now = new Date();
    const createdFrom = new Date(now);
    createdFrom.setDate(createdFrom.getDate() - 30);
    const updatedFrom = new Date(now);
    updatedFrom.setDate(updatedFrom.getDate() - 7);

    const seriesFrom = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);

    const [
      productsTotal,
      productsActive,
      productsInactive,
      variantsTotal,
      variantsActive,
      variantsInactive,
      productsCreatedLast30,
      productsUpdatedLast7,
      variantsCreatedLast30,
      variantsUpdatedLast7,
      productsCreatedByMonthRaw,
      variantsCreatedByMonthRaw,
      latestProducts,
      latestVariants,
    ] = await Promise.all([
      this.productRepo.countAll(),
      this.productRepo.countByActive(true),
      this.productRepo.countByActive(false),
      this.variantRepo.countAll(),
      this.variantRepo.countByActive(true),
      this.variantRepo.countByActive(false),
      this.productRepo.countCreatedSince(createdFrom),
      this.productRepo.countUpdatedSince(updatedFrom),
      this.variantRepo.countCreatedSince(createdFrom),
      this.variantRepo.countUpdatedSince(updatedFrom),
      this.productRepo.createdByMonthSince(seriesFrom),
      this.variantRepo.createdByMonthSince(seriesFrom),
      this.productRepo.latest(10),
      this.variantRepo.latest(10),
    ]);

    return {
      totals: {
        productsTotal,
        productsActive,
        productsInactive,
        variantsTotal,
        variantsActive,
        variantsInactive,
      },
      recent: {
        productsCreatedLast30,
        productsUpdatedLast7,
        variantsCreatedLast30,
        variantsUpdatedLast7,
      },
      series: {
        productsCreatedByMonth: this.fillLastSixMonths(seriesFrom, productsCreatedByMonthRaw),
        variantsCreatedByMonth: this.fillLastSixMonths(seriesFrom, variantsCreatedByMonthRaw),
      },
      latest: {
        products: latestProducts,
        variants: latestVariants,
      },
    };
  }

  private fillLastSixMonths(from: Date, rows: MonthSeries[]): MonthSeries[] {
    const byMonth = new Map(rows.map((r) => [r.month, r.count]));
    const result: MonthSeries[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(from.getFullYear(), from.getMonth() + i, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      result.push({ month, count: byMonth.get(month) ?? 0 });
    }
    return result;
  }
}
