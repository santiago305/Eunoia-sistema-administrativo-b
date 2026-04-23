import { BadRequestException, Body, Controller, Get, Param, Patch, Query, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/utilidades/guards/roles.guard';
import { Roles, User as CurrentUser } from 'src/shared/utilidades/decorators';
import { RoleType } from 'src/shared/constantes/constants';
import { ManageManualIpBlacklistUseCase } from 'src/modules/security/application/use-cases/manage-manual-ip-blacklist.usecase';
import { ManualBanDto } from '../dtos/manual-ban.dto';
import { Response } from 'express';
import { GetTopIpsSecurityUseCase } from 'src/modules/security/application/use-cases/get-top-ips-security.usecase';
import { GetActiveBansSecurityUseCase } from 'src/modules/security/application/use-cases/get-active-bans-security.usecase';
import { GetIpHistorySecurityUseCase } from 'src/modules/security/application/use-cases/get-ip-history-security.usecase';
import { GetActivitySeriesSecurityUseCase } from 'src/modules/security/application/use-cases/get-activity-series-security.usecase';
import { GetReasonDistributionSecurityUseCase } from 'src/modules/security/application/use-cases/get-reason-distribution-security.usecase';
import { GetMethodDistributionSecurityUseCase } from 'src/modules/security/application/use-cases/get-method-distribution-security.usecase';
import { GetTopRoutesSecurityUseCase } from 'src/modules/security/application/use-cases/get-top-routes-security.usecase';
import { GetRiskScoreSecurityUseCase } from 'src/modules/security/application/use-cases/get-risk-score-security.usecase';
import { GetRiskScoreByIpSecurityUseCase } from 'src/modules/security/application/use-cases/get-risk-score-by-ip-security.usecase';
import { ExportSecurityAuditCsvUseCase } from 'src/modules/security/application/use-cases/export-security-audit-csv.usecase';
import { GetSecurityReasonsCatalogUseCase } from 'src/modules/security/application/use-cases/get-security-reasons-catalog.usecase';
import { GetSecuritySummaryUseCase } from 'src/modules/security/application/use-cases/get-security-summary.usecase';
import { SecurityValidationApplicationError } from 'src/modules/security/application/errors/security-validation.error';

@Controller('security')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleType.ADMIN)
export class SecurityController {
  constructor(
    private readonly getTopIpsSecurityUseCase: GetTopIpsSecurityUseCase,
    private readonly getActiveBansSecurityUseCase: GetActiveBansSecurityUseCase,
    private readonly getIpHistorySecurityUseCase: GetIpHistorySecurityUseCase,
    private readonly getActivitySeriesSecurityUseCase: GetActivitySeriesSecurityUseCase,
    private readonly getReasonDistributionSecurityUseCase: GetReasonDistributionSecurityUseCase,
    private readonly getMethodDistributionSecurityUseCase: GetMethodDistributionSecurityUseCase,
    private readonly getTopRoutesSecurityUseCase: GetTopRoutesSecurityUseCase,
    private readonly getRiskScoreSecurityUseCase: GetRiskScoreSecurityUseCase,
    private readonly getRiskScoreByIpSecurityUseCase: GetRiskScoreByIpSecurityUseCase,
    private readonly getSecuritySummaryUseCase: GetSecuritySummaryUseCase,
    private readonly exportSecurityAuditCsvUseCase: ExportSecurityAuditCsvUseCase,
    private readonly getSecurityReasonsCatalogUseCase: GetSecurityReasonsCatalogUseCase,
    private readonly manageManualIpBlacklistUseCase: ManageManualIpBlacklistUseCase,
  ) {}

  @Get('summary')
  getSummary(
    @Query('hours') hours?: string,
    @Query('reason') reason?: string,
  ) {
    return this.getSecuritySummaryUseCase.execute({
      hours: hours ? Number(hours) : undefined,
      reason,
    });
  }

  @Get('top-ips')
  getTopIps(
    @Query('hours') hours?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('reason') reason?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.getTopIpsSecurityUseCase.execute({
      hours: hours ? Number(hours) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      reason,
      sortBy,
      sortOrder,
    });
  }

  @Get('active-bans')
  getActiveBans(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.getActiveBansSecurityUseCase.execute({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('history/:ip')
  getIpHistory(
    @Param('ip') ip: string,
    @Query('limit') limit?: string,
  ) {
    return this.getIpHistorySecurityUseCase.execute(ip, limit ? Number(limit) : undefined);
  }

  @Get('activity-series')
  getActivitySeries(
    @Query('hours') hours?: string,
    @Query('groupBy') groupBy?: string,
    @Query('reason') reason?: string,
  ) {
    return this.getActivitySeriesSecurityUseCase.execute({
      hours: hours ? Number(hours) : undefined,
      groupBy,
      reason,
    });
  }

  @Get('reason-distribution')
  getReasonDistribution(
    @Query('hours') hours?: string,
  ) {
    return this.getReasonDistributionSecurityUseCase.execute({
      hours: hours ? Number(hours) : undefined,
    });
  }

  @Get('method-distribution')
  getMethodDistribution(
    @Query('hours') hours?: string,
    @Query('reason') reason?: string,
  ) {
    return this.getMethodDistributionSecurityUseCase.execute({
      hours: hours ? Number(hours) : undefined,
      reason,
    });
  }

  @Get('reasons')
  getReasons(
    @Query('hours') hours?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.getSecurityReasonsCatalogUseCase.execute({
      hours: hours ? Number(hours) : undefined,
      activeOnly: activeOnly === 'true',
    });
  }

  @Get('top-routes')
  getTopRoutes(
    @Query('hours') hours?: string,
    @Query('limit') limit?: string,
    @Query('reason') reason?: string,
  ) {
    return this.getTopRoutesSecurityUseCase.execute({
      hours: hours ? Number(hours) : undefined,
      limit: limit ? Number(limit) : undefined,
      reason,
    });
  }

  @Get('risk-score')
  getRiskScore(
    @Query('hours') hours?: string,
  ) {
    return this.getRiskScoreSecurityUseCase.execute({
      hours: hours ? Number(hours) : undefined,
    });
  }

  @Get('risk-score/ip')
  getRiskScoreByIp(
    @Query('ip') ip?: string,
    @Query('hours') hours?: string,
  ) {
    if (!ip?.trim()) {
      throw new BadRequestException(new SecurityValidationApplicationError('Query param "ip" es requerido').message);
    }

    return this.getRiskScoreByIpSecurityUseCase.execute({
      ip,
      hours: hours ? Number(hours) : undefined,
    });
  }

  @Get('audit-export')
  async getAuditExport(
    @Query('hours') hours: string | undefined,
    @Query('reason') reason: string | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.exportSecurityAuditCsvUseCase.execute({
      hours: hours ? Number(hours) : undefined,
      reason,
    });

    const today = new Date().toISOString().slice(0, 10);
    const filename = `security-audit-${today}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    return res.status(200).send(csv);
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
