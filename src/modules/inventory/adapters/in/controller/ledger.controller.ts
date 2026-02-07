import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { GetLedgerUseCase } from 'src/modules/inventory/application/use-cases/ladger/get-ledger.usecase';
import { parseDateLocal } from 'src/shared/utilidades/utils/parseDates';
@Controller('inventory/ledger')
@UseGuards(JwtAuthGuard)
export class LedgerController {
  constructor(
    private readonly getLedger: GetLedgerUseCase,
  ) {}

  @Get()
  
  list(
    @Query('warehouseId') warehouseId?: string,
    @Query('variantId') variantId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('docId') docId?: string,
  ) {
    
    return this.getLedger.execute({
      warehouseId,
      variantId,
      from: parseDateLocal(from),
      to: parseDateLocal(to),
      docId,
    });
  }
  
}
