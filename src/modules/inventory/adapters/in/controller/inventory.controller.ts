import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { GetAvailabilityUseCase } from 'src/modules/inventory/application/use-cases/inventory/get-availability.usecase';
import { ListInventoryUseCase } from 'src/modules/inventory/application/use-cases/inventory/list-inventory.usecase';
import { ListInventoryQueryDto } from '../dto/inventory/http-inventory-list.dto';
import { AvailabilityQueryDto } from '../dto/inventory/http-inventory-availability.dto';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(
    private readonly getAvailability: GetAvailabilityUseCase,
    private readonly listInventory: ListInventoryUseCase,
  ) {}

  @Get()
  list(@Query() query: ListInventoryQueryDto) {
    return this.listInventory.execute({
      warehouseId: query.warehouseId,
      variantId: query.variantId,
    });
  }

  @Get('availability')
  availability(@Query() query: AvailabilityQueryDto) {
    return this.getAvailability.execute({
      warehouseId: query.warehouseId,
      variantId: query.variantId,
    });
  }

}
