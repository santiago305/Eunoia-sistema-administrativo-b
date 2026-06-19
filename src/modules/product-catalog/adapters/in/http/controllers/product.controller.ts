import { Body, Controller, Delete, ForbiddenException, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
  import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
  import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
  import { RequireAnyPermissionGroups, RequireDynamicPermissionGroups } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
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
  import { productCatalogPermissionGroupsFromRequest } from "./catalog-permission-groups";
  import { LISTING_SEARCH_STORAGE, ListingSearchStorageRepository } from "src/shared/listing-search/domain/listing-search.repository";
  import { XlsxBuilderService } from "src/shared/application/services/xlsx-builder.service";
  import { AccessControlService } from "src/modules/access-control/application/services/access-control.service";

const PRODUCT_EXPORT_LABELS: Record<string, string> = {
  name: "Nombre",
  description: "Descripcion",
  brand: "Marca",
  skuCount: "Variantes",
  inventoryTotal: "Stock",
  baseUnitName: "Unidad",
  baseUnitCode: "Codigo unidad",
  isActive: "Activo",
  createdAt: "Creado",
  updatedAt: "Actualizado",
};

  @Controller("products")
  @UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
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
      private readonly accessControlService: AccessControlService,
      @Inject(LISTING_SEARCH_STORAGE)
      private readonly listingSearchStorage: ListingSearchStorageRepository,
    ) {}

    @RequireDynamicPermissionGroups(productCatalogPermissionGroupsFromRequest("create"))
    @Post()
    create(@Body() dto: CreateProductCatalogProductDto) {
      return this.createProduct.execute(dto);
    }

    @RequireDynamicPermissionGroups(productCatalogPermissionGroupsFromRequest("view", "catalog.read"))
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

    @RequireDynamicPermissionGroups(productCatalogPermissionGroupsFromRequest("view", "catalog.read"))
    @Get("search-state")
    getSearchStateForUser(@CurrentUser() user: { id: string }, @Query("type") type?: ProductCatalogProductType) {
      return this.getSearchState.execute(user.id, type);
    }

    @RequireDynamicPermissionGroups(productCatalogPermissionGroupsFromRequest("view", "catalog.read"))
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

    @RequireDynamicPermissionGroups(productCatalogPermissionGroupsFromRequest("view", "catalog.read"))
    @Delete("search-metrics/:metricId")
    deleteMetric(
      @Param("metricId", ParseUUIDPipe) metricId: string,
      @CurrentUser() user: { id: string },
      @Query("type") type?: ProductCatalogProductType,
    ) {
      return this.deleteSearchMetric.execute(user.id, metricId, type);
    }

    @RequireDynamicPermissionGroups(productCatalogPermissionGroupsFromRequest("export"))
    @Get("export-columns")
    async listExportColumns(@Query() query: ListProductCatalogProductsDto, @CurrentUser() user: { id: string }) {
      const data = await this.list(query, user);
      const rows = this.toExportRows(data?.items);
      return this.buildExportColumnsFromFirstRow(rows[0] ?? {}, PRODUCT_EXPORT_LABELS);
    }

    @RequireDynamicPermissionGroups(productCatalogPermissionGroupsFromRequest("export"))
    @Get("export-presets")
    getExportPresets(@CurrentUser() user: { id: string }, @Query("type") type?: ProductCatalogProductType) {
      return this.listingSearchStorage.listState({
        userId: user.id,
        tableKey: `products:export:${type ?? "ALL"}`,
      }).then((state) => state.metrics);
    }

    @RequireDynamicPermissionGroups(productCatalogPermissionGroupsFromRequest("export"))
    @Post("export-presets")
    saveExportPreset(
      @CurrentUser() user: { id: string },
      @Body() body: { name: string; type?: ProductCatalogProductType; columns: Array<{ key: string; label: string }> },
    ) {
      return this.listingSearchStorage.createMetric({
        userId: user.id,
        tableKey: `products:export:${body.type ?? "ALL"}`,
        name: body.name,
        snapshot: { q: "", filters: [], ...(body as any) } as any,
      });
    }

    @RequireDynamicPermissionGroups(productCatalogPermissionGroupsFromRequest("export"))
    @Delete("export-presets/:metricId")
    deleteExportPreset(
      @CurrentUser() user: { id: string },
      @Param("metricId", ParseUUIDPipe) metricId: string,
      @Query("type") type?: ProductCatalogProductType,
    ) {
      return this.listingSearchStorage.deleteMetric({
        userId: user.id,
        tableKey: `products:export:${type ?? "ALL"}`,
        metricId,
      });
    }

    @RequireDynamicPermissionGroups(productCatalogPermissionGroupsFromRequest("export"))
    @Post("export-excel")
    async exportExcel(
      @Body() body: ListProductCatalogProductsDto & { columns: Array<{ key: string; label: string }> },
      @CurrentUser() user: { id: string },
      @Res() res: Response,
    ) {
      const payload = await this.list(body, user);
      const rows = this.toExportRows(payload?.items);
      const columns = (body.columns?.length
        ? body.columns
        : this.buildExportColumnsFromFirstRow(rows[0] ?? {}, PRODUCT_EXPORT_LABELS))
        .map((column) => ({ key: column.key, header: column.label }));
      const sheetName = body.type === ProductCatalogProductType.MATERIAL ? "Materia prima" : "Productos";
      const fileNamePrefix = body.type === ProductCatalogProductType.MATERIAL ? "materia-prima" : "productos";
      const buffer = await new XlsxBuilderService().build({
        sheetName,
        columns,
        rows,
      });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${fileNamePrefix}-${new Date().toISOString().slice(0, 10)}.xlsx"`);
      return res.status(200).send(buffer);
    }

    @RequireAnyPermissionGroups(["products.view_detail", "materials.view_detail", "catalog.read"])
    @Get(":id")
    getById(@Param("id", ParseUUIDPipe) id: string) {
      return this.getProduct.execute(id);
    }

    @RequireAnyPermissionGroups(["products.view_detail", "materials.view_detail", "catalog.read"])
    @Get(":id/detail")
    getDetail(@Param("id", ParseUUIDPipe) id: string, @Query("warehouseId") warehouseId?: string) {
      return this.getProductDetail.execute(id, warehouseId);
    }

    @RequireAnyPermissionGroups(["products.update", "materials.update"])
    @Patch(":id")
    async update(
      @Param("id", ParseUUIDPipe) id: string,
      @Body() dto: UpdateProductCatalogProductDto,
      @CurrentUser() user: { id: string },
    ) {
      await this.ensureProductPermission(user.id, id, "update");
      return this.updateProduct.execute(id, dto);
    }

    private async ensureProductPermission(userId: string, productId: string, action: "update") {
      const { product } = await this.getProduct.execute(productId);
      const prefix = product.type === ProductCatalogProductType.MATERIAL ? "materials" : "products";
      const allowed = await this.accessControlService.userHasAllPermissions(userId, [`${prefix}.${action}`]);
      if (!allowed) throw new ForbiddenException("Acceso denegado: permisos insuficientes");
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

    private toExportRows(items: unknown): Record<string, unknown>[] {
      if (!Array.isArray(items)) return [];
      return items.map((item: any) => ({
        name: item?.name ?? "",
        description: item?.description ?? "",
        brand: item?.brand ?? "",
        skuCount: item?.skuCount ?? 0,
        inventoryTotal: item?.inventoryTotal ?? 0,
        baseUnitName: item?.baseUnitName ?? item?.baseUnit?.name ?? item?.baseUnit ?? "",
        baseUnitCode: item?.baseUnitCode ?? item?.baseUnit?.code ?? "",
        isActive: item?.isActive ? "Activo" : "Inactivo",
        createdAt: item?.createdAt ?? "",
        updatedAt: item?.updatedAt ?? "",
      }));
    }

    private buildExportColumnsFromFirstRow(row: Record<string, unknown>, labels: Record<string, string>) {
      return Object.keys(row).map((key) => ({
        key,
        label: labels[key] ?? key,
      }));
    }
  }
