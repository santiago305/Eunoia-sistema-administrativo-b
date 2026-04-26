import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
  import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
  import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
  import { CreateProductCatalogProduct } from "src/modules/product-catalog/application/usecases/create-product.usecase";
  import { GetProductCatalogProduct } from "src/modules/product-catalog/application/usecases/get-product.usecase";
  import { ListProductCatalogProducts } from "src/modules/product-catalog/application/usecases/list-products.usecase";
  import { UpdateProductCatalogProduct } from "src/modules/product-catalog/application/usecases/update-product.usecase";
  import { GetProductCatalogProductDetail } from "src/modules/product-catalog/application/usecases/get-product-detail.usecase";
  import { CreateProductCatalogProductDto } from "../dtos/create-product.dto";
  import { ListProductCatalogProductsDto } from "../dtos/list-products.dto";
  import { UpdateProductCatalogProductDto } from "../dtos/update-product.dto";
  import type { ProductCatalogProductSearchRule } from "src/modules/product-catalog/domain/ports/product.repository";
  import { User as CurrentUser } from "src/shared/utilidades/decorators/user.decorator";
  import { GetProductCatalogProductSearchStateUsecase } from "src/modules/product-catalog/application/usecases/product-search/get-state.usecase";
  import { SaveProductCatalogProductSearchMetricUsecase } from "src/modules/product-catalog/application/usecases/product-search/save-metric.usecase";
  import { DeleteProductCatalogProductSearchMetricUsecase } from "src/modules/product-catalog/application/usecases/product-search/delete-metric.usecase";
  import { HttpCreateProductSearchMetricDto } from "../dtos/http-product-search-metric-create.dto";
  import { sanitizeProductCatalogProductSearchSnapshot } from "src/modules/product-catalog/application/support/product-search.utils";
  import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";

  @Controller("products")
  @UseGuards(JwtAuthGuard, CompanyConfiguredGuard)
  export class ProductCatalogProductController {
    constructor(
      private readonly createProduct: CreateProductCatalogProduct,
      private readonly updateProduct: UpdateProductCatalogProduct,
      private readonly listProducts: ListProductCatalogProducts,
      private readonly getProduct: GetProductCatalogProduct,
      private readonly getProductDetail: GetProductCatalogProductDetail,
      private readonly getSearchState: GetProductCatalogProductSearchStateUsecase,
      private readonly saveSearchMetric: SaveProductCatalogProductSearchMetricUsecase,
      private readonly deleteSearchMetric: DeleteProductCatalogProductSearchMetricUsecase,
    ) {}

    @Post()
    create(@Body() dto: CreateProductCatalogProductDto) {
      return this.createProduct.execute(dto);
    }

    @Get()
    list(@Query() query: ListProductCatalogProductsDto, @CurrentUser() user: { id: string }) {
      return this.listProducts.execute({
        q: query.q,
        type: query.type,
        isActive: query.isActive === undefined ? undefined : query.isActive === "true",
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 10,
        filters: this.parseFilters(query.filters),
        requestedBy: user?.id,
      });
    }

    @Get("search-state")
    getSearchStateForUser(@CurrentUser() user: { id: string }, @Query("type") type?: ProductCatalogProductType) {
      return this.getSearchState.execute(user.id, type);
    }

    @Post("search-metrics")
    saveMetric(
      @Body() dto: HttpCreateProductSearchMetricDto,
      @CurrentUser() user: { id: string },
      @Query("type") type?: ProductCatalogProductType,
    ) {
      return this.saveSearchMetric.execute({
        userId: user.id,
        type,
        name: dto.name,
        snapshot: sanitizeProductCatalogProductSearchSnapshot({
          q: dto.snapshot?.q,
          filters: dto.snapshot?.filters,
        }),
      });
    }

    @Delete("search-metrics/:metricId")
    deleteMetric(
      @Param("metricId", ParseUUIDPipe) metricId: string,
      @CurrentUser() user: { id: string },
      @Query("type") type?: ProductCatalogProductType,
    ) {
      return this.deleteSearchMetric.execute(user.id, metricId, type);
    }

    @Get(":id")
    getById(@Param("id", ParseUUIDPipe) id: string) {
      return this.getProduct.execute(id);
    }

    @Get(":id/detail")
    getDetail(@Param("id", ParseUUIDPipe) id: string) {
      return this.getProductDetail.execute(id);
    }

    @Patch(":id")
    update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateProductCatalogProductDto) {
      return this.updateProduct.execute(id, dto);
    }

    private parseFilters(raw?: string): ProductCatalogProductSearchRule[] | undefined {
      if (!raw?.trim()) return undefined;
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as ProductCatalogProductSearchRule[]) : undefined;
      } catch {
        return undefined;
      }
    }
  }
