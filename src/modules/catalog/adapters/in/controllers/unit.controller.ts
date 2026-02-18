import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { ListUnits } from 'src/modules/catalog/application/usecases/unit/list.usecase';

@Controller('catalog/units')
@UseGuards(JwtAuthGuard)
export class UnitsController {
  constructor(
    private readonly listUnits: ListUnits,
  ) {}

  @Get()
  list() {
    return this.listUnits.execute();
  }
}
