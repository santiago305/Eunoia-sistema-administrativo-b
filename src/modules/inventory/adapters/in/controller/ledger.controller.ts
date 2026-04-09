import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { GetLedgerUseCase } from 'src/modules/inventory/application/use-cases/ledger/get-ledger.usecase';
import { GetSalesWeekdayTotalsUseCase } from 'src/modules/inventory/application/use-cases/analytics/get-sales-weekday-totals.usecase';
import { GetSalesWarehouseTotalsUseCase } from 'src/modules/inventory/application/use-cases/analytics/get-sales-warehouse-totals.usecase';
import { GetSalesDailyTotalsUseCase } from 'src/modules/inventory/application/use-cases/analytics/get-sales-daily-totals.usecase';
import { GetDemandSummaryUseCase } from 'src/modules/inventory/application/use-cases/analytics/get-demand-summary.usecase';
import { GetMonthlyProjectionUseCase } from 'src/modules/inventory/application/use-cases/analytics/get-monthly-projection.usecase';
import {ParseDateLocal } from 'src/shared/utilidades/utils/ParseDates';
import { GetLedgerQueryDto } from '../dto/ledger/http-list-ledger.dto';
import { GetLedgerDailyTotalsQueryDto } from '../dto/ledger/http-ledger-daily-totals.dto';
import { GetLedgerMonthlyTotalsQueryDto } from '../dto/ledger/http-ledger-monthly-totals.dto';
import { GetLedgerWeekdayTotalsQueryDto } from '../dto/ledger/http-ledger-weekday-totals.dto';
import { GetLedgerWarehouseTotalsQueryDto } from '../dto/ledger/http-ledger-warehouse-totals.dto';
import { GetDemandSummaryQueryDto } from '../dto/ledger/http-demand-summary.dto';
import { GetMonthlyProjectionQueryDto } from '../dto/ledger/http-monthly-projection.dto';
import { InventoryHttpMapper } from 'src/modules/inventory/application/mappers/inventory-http.mapper';
import { GetSalesMonthlyTotalsUseCase } from 'src/modules/inventory/application/use-cases/analytics/get-sales-monthly-totals.usecase';
import { GetLedgerDailyTotalsUseCase } from 'src/modules/inventory/application/use-cases/ledger/get-ledger-daily-totals.usecase';
@Controller('inventory/ledger')
@UseGuards(JwtAuthGuard)
export class LedgerController {
  constructor(
    private readonly getLedger: GetLedgerUseCase,
    private readonly getLedgerDailyTotals: GetLedgerDailyTotalsUseCase,
    private readonly getSalesMonthlyTotals: GetSalesMonthlyTotalsUseCase,
    private readonly getSalesWeekdayTotals: GetSalesWeekdayTotalsUseCase,
    private readonly getSalesWarehouseTotals: GetSalesWarehouseTotalsUseCase,
    private readonly getSalesDailyTotals: GetSalesDailyTotalsUseCase,
    private readonly getDemandSummary: GetDemandSummaryUseCase,
    private readonly getMonthlyProjection: GetMonthlyProjectionUseCase,
  ) {}

  @Get()
  list(@Query() query: GetLedgerQueryDto) {
    return this.getLedger.execute(InventoryHttpMapper.toGetLedgerInput({
      warehouseId: query.warehouseId,
      stockItemId: query.stockItemId,
      locationId: query.locationId,
      docId: query.docId,
      from: query.from ?ParseDateLocal(query.from) : undefined,
      to: query.to ?ParseDateLocal(query.to) : undefined,
      page: query.page,
      limit: query.limit,
    }));
  }

  @Get('totals/daily')
  totalsDaily(@Query() query: GetLedgerDailyTotalsQueryDto) {
    return this.getLedgerDailyTotals.execute(InventoryHttpMapper.toGetLedgerDailyTotalsInput({
      warehouseId: query.warehouseId,
      stockItemId: query.stockItemId,
      locationId: query.locationId,
      docId: query.docId,
      from: query.from ? ParseDateLocal(query.from) : undefined,
      to: query.to ? ParseDateLocal(query.to) : undefined,
    }));
  }

  @Get('totals/monthly')
  totalsMonthly(@Query() query: GetLedgerMonthlyTotalsQueryDto) {
    return this.getSalesMonthlyTotals.execute(InventoryHttpMapper.toGetSalesTotalsInput({
      warehouseId: query.warehouseId,
      stockItemId: query.stockItemId,
      locationId: query.locationId,
      docId: query.docId,
      from: query.from ? ParseDateLocal(query.from) : undefined,
      to: query.to ? ParseDateLocal(query.to) : undefined,
    }));
  }

  @Get('totals/daily-sales')
  totalsDailySales(@Query() query: GetLedgerDailyTotalsQueryDto) {
    return this.getSalesDailyTotals.execute(InventoryHttpMapper.toGetSalesTotalsInput({
      warehouseId: query.warehouseId,
      stockItemId: query.stockItemId,
      locationId: query.locationId,
      docId: query.docId,
      month: query.month,
      from: query.from ? ParseDateLocal(query.from) : undefined,
      to: query.to ? ParseDateLocal(query.to) : undefined,
    }));
  }

  @Get('totals/weekday')
  totalsWeekday(@Query() query: GetLedgerWeekdayTotalsQueryDto) {
    return this.getSalesWeekdayTotals.execute(InventoryHttpMapper.toGetSalesTotalsInput({
      warehouseId: query.warehouseId,
      stockItemId: query.stockItemId,
      locationId: query.locationId,
      docId: query.docId,
      from: query.from ? ParseDateLocal(query.from) : undefined,
      to: query.to ? ParseDateLocal(query.to) : undefined,
    }));
  }

  @Get('totals/warehouse')
  totalsWarehouse(@Query() query: GetLedgerWarehouseTotalsQueryDto) {
    return this.getSalesWarehouseTotals.execute(InventoryHttpMapper.toGetSalesTotalsInput({
      warehouseId: query.warehouseId,
      stockItemId: query.stockItemId,
      locationId: query.locationId,
      docId: query.docId,
      from: query.from ? ParseDateLocal(query.from) : undefined,
      to: query.to ? ParseDateLocal(query.to) : undefined,
    }));
  }

  @Get('analytics/demand')
  demandSummary(@Query() query: GetDemandSummaryQueryDto) {
    return this.getDemandSummary.execute(InventoryHttpMapper.toGetDemandSummaryInput({
      warehouseId: query.warehouseId,
      stockItemId: query.stockItemId,
      locationId: query.locationId,
      from: query.from ? ParseDateLocal(query.from) : undefined,
      to: query.to ? ParseDateLocal(query.to) : undefined,
      windowDays: query.windowDays,
      horizonDays: query.horizonDays,
    }));
  }

  @Get('analytics/monthly-projection')
  monthlyProjection(@Query() query: GetMonthlyProjectionQueryDto) {
    return this.getMonthlyProjection.execute(InventoryHttpMapper.toGetMonthlyProjectionInput({
      warehouseId: query.warehouseId,
      stockItemId: query.stockItemId,
      locationId: query.locationId,
      to: query.to ? ParseDateLocal(query.to) : undefined,
      months: query.months,
    }));
  }
  
}
