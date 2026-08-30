import { Body, Controller, Get, Patch, Post, Query, Param, UseGuards } from '@nestjs/common';
import { RequirePermissions } from 'src/modules/access-control/adapters/in/decorators/require-permissions.decorator';
import { PermissionsGuard } from 'src/modules/access-control/adapters/in/guards/permissions.guard';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { CompanyConfiguredGuard } from 'src/shared/utilidades/guards/company-configured.guard';
import { CreateAdviserUsecase } from '../../../application/usecases/create-adviser.usecase';
import { ListAdvisersUsecase } from '../../../application/usecases/list-advisers.usecase';
import { CreateAdviserDto } from '../dtos/create-adviser.dto';
import { ListAdviserSummaryUsecase } from '../../../application/usecases/list-adviser-summary.usecase';
import { SetAdviserActiveUsecase } from '../../../application/usecases/set-adviser-active.usecase';
import { UpdateAdviserUsecase } from '../../../application/usecases/update-adviser.usecase';

@Controller('advisers')
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard)
export class AdvisersController {
  constructor(
    private readonly listAdvisers: ListAdvisersUsecase,
    private readonly createAdviser: CreateAdviserUsecase,
    private readonly summary: ListAdviserSummaryUsecase,
    private readonly setActive: SetAdviserActiveUsecase,
    private readonly updateAdviser: UpdateAdviserUsecase,
  ) {}

  @Get()
  list() {
    return this.listAdvisers.execute();
  }

  @Get('summary')
  @RequirePermissions('advisers.view')
  summaryList(@Query('page') page?: number, @Query('limit') limit?: number, @Query('q') q?: string) {
    return this.summary.execute({ page, limit, q });
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users.assign_roles')
  create(@Body() dto: CreateAdviserDto) {
    return this.createAdviser.execute({ userId: dto.userId });
  }

  @Patch(':userId/active')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('advisers.manage')
  setAdviserActive(@Param('userId') userId: string, @Body('isActive') isActive: boolean) {
    return this.setActive.execute(userId, Boolean(isActive));
  }

  @Patch(':userId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('advisers.manage')
  update(@Param('userId') userId: string, @Body() body: { name?: string; email?: string }) {
    return this.updateAdviser.execute(userId, body);
  }
}
