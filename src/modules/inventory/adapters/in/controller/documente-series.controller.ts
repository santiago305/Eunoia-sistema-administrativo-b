import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { DocType } from 'src/modules/inventory/domain/value-objects/doc-type';
import { CreateDocumentSerieUseCase } from 'src/modules/inventory/application/use-cases/document-serie/create-document-serie.usecase';
import { GetDocumentSerieUseCase } from 'src/modules/inventory/application/use-cases/document-serie/get-document-serie.usecase';
import { GetActiveDocumentSerieUseCase } from 'src/modules/inventory/application/use-cases/document-serie/get-document-series.usecase';
import { CreateDocumentSerieDto } from '../dto/document-serie/http-document-serie-create.dto';
import { HttpSetDocumentSerieActiveDto } from '../dto/document-serie/http-document-serie-set-active.dto';
import { SetDocumentSerieActive } from 'src/modules/inventory/application/use-cases/document-serie/set-active.usecase'
@Controller('inventory/document-series')
@UseGuards(JwtAuthGuard)
export class DocumentSeriesController {
  constructor(
    private readonly createSerie: CreateDocumentSerieUseCase,
    private readonly getSerie: GetDocumentSerieUseCase,
    private readonly getActiveSerie: GetActiveDocumentSerieUseCase,
    private readonly setActive: SetDocumentSerieActive,
  ) {}

  @Post()
  create(@Body() dto: CreateDocumentSerieDto) {
    return this.createSerie.execute(dto);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.getSerie.execute({ id });
  }

  @Get()
  getActive(
    @Query('docType') docType: DocType,
    @Query('warehouseId') warehouseId: string,
  ) {
    return this.getActiveSerie.execute({ docType, warehouseId });
  }
  @Patch(':id/active')
  setActiveById(@Param('id', ParseUUIDPipe) id: string, @Body() dto: HttpSetDocumentSerieActiveDto) {
    return this.setActive.execute({ id, isActive: dto.isActive });
  }
}
