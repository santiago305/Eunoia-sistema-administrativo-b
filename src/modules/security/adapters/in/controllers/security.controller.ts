import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/utilidades/guards/roles.guard';
import { Roles, User as CurrentUser } from 'src/shared/utilidades/decorators';
import { RoleType } from 'src/shared/constantes/constants';
import { GetIpSecurityInsightsUseCase } from 'src/modules/security/application/use-cases/get-ip-security-insights.usecase';
import { ManageManualIpBlacklistUseCase } from 'src/modules/security/application/use-cases/manage-manual-ip-blacklist.usecase';
import { ManualBanDto } from '../dtos/manual-ban.dto';

@Controller('security')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleType.ADMIN)
export class SecurityController {
  constructor(
    private readonly getIpSecurityInsightsUseCase: GetIpSecurityInsightsUseCase,
    private readonly manageManualIpBlacklistUseCase: ManageManualIpBlacklistUseCase,
  ) {}

  @Get('top-ips')
  getTopIps(
    @Query('hours') hours?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedHours = hours ? Number(hours) : undefined;
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.getIpSecurityInsightsUseCase.getTopIps({ hours: parsedHours, limit: parsedLimit });
  }

  @Get('active-bans')
  getActiveBans() {
    return this.getIpSecurityInsightsUseCase.getActiveBans();
  }

  @Get('history/:ip')
  getIpHistory(
    @Param('ip') ip: string,
    @Query('limit') limit?: string,
  ) {
    return this.getIpSecurityInsightsUseCase.getIpHistory(ip, limit ? Number(limit) : undefined);
  }

  @Get('activity-series')
  getActivitySeries(
    @Query('hours') hours?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    return this.getIpSecurityInsightsUseCase.getActivitySeries({
      hours: hours ? Number(hours) : undefined,
      groupBy,
    });
  }

  @Get('reason-distribution')
  getReasonDistribution(
    @Query('hours') hours?: string,
  ) {
    return this.getIpSecurityInsightsUseCase.getReasonDistribution({
      hours: hours ? Number(hours) : undefined,
    });
  }

  @Get('method-distribution')
  getMethodDistribution(
    @Query('hours') hours?: string,
  ) {
    return this.getIpSecurityInsightsUseCase.getMethodDistribution({
      hours: hours ? Number(hours) : undefined,
    });
  }

  @Get('top-routes')
  getTopRoutes(
    @Query('hours') hours?: string,
    @Query('limit') limit?: string,
  ) {
    return this.getIpSecurityInsightsUseCase.getTopRoutes({
      hours: hours ? Number(hours) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('risk-score')
  getRiskScore(
    @Query('hours') hours?: string,
  ) {
    return this.getIpSecurityInsightsUseCase.getRiskScore({
      hours: hours ? Number(hours) : undefined,
    });
  }

  @Patch('blacklist')
  setManualBlacklist(
    @Body() dto: ManualBanDto,
    @CurrentUser() user: { id: string; email?: string },
  ) {
    return this.manageManualIpBlacklistUseCase.setManualPermanentBan({
      ip: dto.ip,
      notes: dto.notes,
      createdBy: user.email ?? user.id,
      reviewedBy: user.email ?? user.id,
    });
  }

  @Patch('blacklist/remove/:ip')
  removeManualBlacklist(
    @Param('ip') ip: string,
    @CurrentUser() user: { id: string; email?: string },
  ) {
    return this.manageManualIpBlacklistUseCase.removeManualPermanentBan(ip, user.email ?? user.id);
  }
}
