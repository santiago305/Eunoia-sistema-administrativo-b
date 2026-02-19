import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { GetCatalogSummary } from 'src/modules/catalog/application/usecases/catalog/get-summary.usecase';
import { SearchProductsPaginated } from 'src/modules/catalog/application/usecases/product/search-paginated.usecase';
import { SearchProductVariants } from 'src/modules/catalog/application/usecases/product-variant/search.usecase';

@Controller('catalog')
@UseGuards(JwtAuthGuard)
export class CatalogSummaryController {
  constructor(
    private readonly summary: GetCatalogSummary,
    private readonly searchProducts: SearchProductsPaginated,
    private readonly searchVariants: SearchProductVariants,
  ) {}

  @Get('summary')
  getSummary() {
    return this.summary.execute();
  }

  @Get('products/latest')
  async productsLatest(@Query('limit') limit?: string) {
    const safeLimit = this.toSafeLimit(limit);
    const result = await this.searchProducts.execute({ page: 1, limit: safeLimit });
    return result.items;
  }

  @Get('variants/latest')
  async variantsLatest(@Query('limit') limit?: string) {
    const safeLimit = this.toSafeLimit(limit);
    const result = await this.searchVariants.execute({ page: 1, limit: safeLimit });
    return result.items.map((v) => ({
      id: v.id,
      sku: v.sku,
      productId: v.productId,
      isActive: v.isActive,
      createdAt: v.createdAt,
    }));
  }

  private toSafeLimit(limit?: string): number {
    const parsed = Number(limit ?? 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return 10;
    return Math.min(Math.floor(parsed), 100);
  }
}
