import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { GetAvailabilityUseCase } from 'src/modules/inventory/application/use-cases/inventory/get-availability.usecase';
import { ListInventoryUseCase } from 'src/modules/inventory/application/use-cases/inventory/list-inventory.usecase';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(
    private readonly getAvailability: GetAvailabilityUseCase,
    private readonly listInventory: ListInventoryUseCase,
  ) {}

  @Get()
  list(
    @Query('warehouseId') warehouseId?: string,
    @Query('variantId') variantId?: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.listInventory.execute({ warehouseId, variantId, locationId });
  }

  @Get('availability')
  availability(
    @Query('warehouseId') warehouseId: string,
    @Query('variantId') variantId: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.getAvailability.execute({ warehouseId, variantId, locationId });
  }
}
