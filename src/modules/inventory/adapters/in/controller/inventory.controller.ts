import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { GetAvailabilityUseCase } from 'src/modules/inventory/application/use-cases/inventory/get-availability.usecase';
import { GetStockUseCase } from 'src/modules/inventory/application/use-cases/inventory/get-stock.usecase';
import { ListInventoryUseCase } from 'src/modules/inventory/application/use-cases/inventory/list-inventory.usecase';
import { ListInventoryQueryDto } from '../dto/inventory/http-inventory-list.dto';
import { AvailabilityQueryDto } from '../dto/inventory/http-inventory-availability.dto';
import { GetStockQueryDto } from '../dto/inventory/http-inventory-stock.dto';
import { InventoryHttpMapper } from 'src/modules/inventory/application/mappers/inventory-http.mapper';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(
    private readonly getAvailability: GetAvailabilityUseCase,
    private readonly getStocked: GetStockUseCase,
    private readonly listInventory: ListInventoryUseCase,
  ) {}

  @Get()
  list(@Query() query: ListInventoryQueryDto) {
    return this.listInventory.execute(InventoryHttpMapper.toListInventoryInput(query));
  }

  @Get('availability')
  availability(@Query() query: AvailabilityQueryDto) {
    return this.getAvailability.execute(InventoryHttpMapper.toAvailabilityInput(query));
  }

  @Get('get-stock')
  getStock(@Query() query: GetStockQueryDto) {
    return this.getStocked.execute(InventoryHttpMapper.toGetStockInput(query));
  }

}

