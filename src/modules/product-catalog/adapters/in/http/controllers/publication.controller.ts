import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateProductCatalogPublication } from "src/modules/product-catalog/application/usecases/create-publication.usecase";
import { ListProductCatalogChannelSkus } from "src/modules/product-catalog/application/usecases/list-channel-skus.usecase";
import { UpdateProductCatalogPublication } from "src/modules/product-catalog/application/usecases/update-publication.usecase";
import { CreateProductCatalogPublicationDto } from "../dtos/create-publication.dto";
import { ListProductCatalogProductsDto } from "../dtos/list-products.dto";
import { UpdateProductCatalogPublicationDto } from "../dtos/update-publication.dto";

@Controller("channels")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class ProductCatalogPublicationController {
  constructor(
    private readonly createPublication: CreateProductCatalogPublication,
    private readonly updatePublication: UpdateProductCatalogPublication,
    private readonly listChannelSkus: ListProductCatalogChannelSkus,
  ) {}

  @RequirePermissions("catalog.manage")
  @Post("skus")
  create(@Body() dto: CreateProductCatalogPublicationDto) {
    return this.createPublication.execute(dto);
  }

  @RequirePermissions("catalog.read")
  @Get(":channelCode/skus")
  list(@Param("channelCode") channelCode: string, @Query() query: ListProductCatalogProductsDto) {
    return this.listChannelSkus.execute({
      channelCode,
      q: query.q,
      isActive: query.isActive === undefined ? undefined : query.isActive === "true",
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 10,
    });
  }

  @RequirePermissions("catalog.manage")
  @Patch("skus/:id")
  update(@Param("id") id: string, @Body() dto: UpdateProductCatalogPublicationDto) {
    return this.updatePublication.execute(id, dto);
  }
}
