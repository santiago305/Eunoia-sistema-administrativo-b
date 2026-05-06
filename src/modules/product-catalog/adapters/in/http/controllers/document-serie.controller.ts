import { Controller, UseGuards, Get, Query } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { GetActiveProductCatalogDocumentSerieUseCase } from "src/modules/product-catalog/application/usecases/get-active-document-series.usecase";
import { GetActiveSerieDto } from "../dtos/get-active-serie.dto";

@Controller("series")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductCatalogDocumentSerieController {
  constructor(
    private readonly getDocumentSerie: GetActiveProductCatalogDocumentSerieUseCase,
  ) {}

  @RequirePermissions("catalog.read")
  @Get("active")
  list(@Query() query: GetActiveSerieDto) {
    return this.getDocumentSerie.execute({
      warehouseId: query.warehouseId,
      docType: query.docType,
      isActive: query.isActive !== undefined ? query.isActive === "true" : undefined,
    });
  }
}
