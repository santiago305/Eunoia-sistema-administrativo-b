import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { GetLedgerUseCase } from 'src/modules/inventory/application/use-cases/ladger/get-ledger.usecase';
import {ParseDateLocal } from 'src/shared/utilidades/utils/ParseDates';
import { GetLedgerQueryDto } from '../dto/ledger/http-list-ledger.dto';
@Controller('inventory/ledger')
@UseGuards(JwtAuthGuard)
export class LedgerController {
  constructor(
    private readonly getLedger: GetLedgerUseCase,
  ) {}

  @Get()
  list(@Query() query: GetLedgerQueryDto) {
    return this.getLedger.execute({
      warehouseId: query.warehouseId,
      stockItemId: query.stockItemId,
      locationId: query.locationId,
      docId: query.docId,
      from: query.from ?ParseDateLocal(query.from) : undefined,
      to: query.to ?ParseDateLocal(query.to) : undefined,
      page: query.page,
      limit: query.limit,
    });
  }
  
}

