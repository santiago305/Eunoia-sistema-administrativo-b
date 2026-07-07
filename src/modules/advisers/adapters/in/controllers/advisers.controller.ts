import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { RequirePermissions } from 'src/modules/access-control/adapters/in/decorators/require-permissions.decorator';
import { PermissionsGuard } from 'src/modules/access-control/adapters/in/guards/permissions.guard';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { CompanyConfiguredGuard } from 'src/shared/utilidades/guards/company-configured.guard';
import { CreateAdviserUsecase } from '../../../application/usecases/create-adviser.usecase';
import { ListAdvisersUsecase } from '../../../application/usecases/list-advisers.usecase';
import { CreateAdviserDto } from '../dtos/create-adviser.dto';

@Controller('advisers')
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard)
export class AdvisersController {
  constructor(
    private readonly listAdvisers: ListAdvisersUsecase,
    private readonly createAdviser: CreateAdviserUsecase,
  ) {}

  @Get()
  list() {
    return this.listAdvisers.execute();
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users.assign_roles')
  create(@Body() dto: CreateAdviserDto) {
    return this.createAdviser.execute({ userId: dto.userId });
  }
}
