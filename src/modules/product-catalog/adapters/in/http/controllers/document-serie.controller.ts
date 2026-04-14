import { Controller, UseGuards, Get, Query } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { GetActiveProductCatalogDocumentSerieUseCase } from "src/modules/product-catalog/application/usecases/get-active-document-series.usecase";
import { GetActiveSerieDto } from "../dtos/get-active-serie.dto";

@Controller("series")
@UseGuards(JwtAuthGuard)
export class ProductCatalogDocumentSerieController {
  constructor(
    private readonly getDocumentSerie: GetActiveProductCatalogDocumentSerieUseCase,
  ) {}

  @Get("active")
  list(@Query() query: GetActiveSerieDto) {
    return this.getDocumentSerie.execute({
      warehouseId: query.warehouseId,
      docType: query.docType,
      isActive: query.isActive !== undefined ? query.isActive === "true" : undefined,
    });
  }
}