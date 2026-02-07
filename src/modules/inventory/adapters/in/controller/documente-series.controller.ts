import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { DocType } from 'src/modules/inventory/domain/value-objects/doc-type';
import { CreateDocumentSerieUseCase } from 'src/modules/inventory/application/use-cases/document-serie/create-document-serie.usecase';
import { GetDocumentSerieUseCase } from 'src/modules/inventory/application/use-cases/document-serie/get-document-serie.usecase';
import { GetActiveDocumentSerieUseCase } from 'src/modules/inventory/application/use-cases/document-serie/get-active-document-serie.usecase';
import { CreateDocumentSerieInput } from 'src/modules/inventory/application/dto/inputs';

@Controller('inventory/document-series')
@UseGuards(JwtAuthGuard)
export class DocumentSeriesController {
  constructor(
    private readonly createSerie: CreateDocumentSerieUseCase,
    private readonly getSerie: GetDocumentSerieUseCase,
    private readonly getActiveSerie: GetActiveDocumentSerieUseCase,
  ) {}

  @Post()
  create(@Body() dto: CreateDocumentSerieInput) {
    return this.createSerie.execute(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.getSerie.execute({ id });
  }

  @Get()
  getActive(
    @Query('docType') docType: DocType,
    @Query('warehouseId') warehouseId: string,
  ) {
    return this.getActiveSerie.execute({ docType, warehouseId });
  }
}
