import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IpViolation } from '../adapters/out/persistence/typeorm/entities/ip-violation.entity';
import { IpBan } from '../adapters/out/persistence/typeorm/entities/ip-ban.entity';
import { SecurityReasonCatalog } from '../adapters/out/persistence/typeorm/entities/security-reason-catalog.entity';
import { SecurityController } from '../adapters/in/controllers/security.controller';
import { ResolveClientIpUseCase } from '../application/use-cases/resolve-client-ip.usecase';
import { CheckIpBanUseCase } from '../application/use-cases/check-ip-ban.usecase';
import { RegisterIpViolationAndApplyPolicyUseCase } from '../application/use-cases/register-ip-violation-and-apply-policy.usecase';
import { ManageManualIpBlacklistUseCase } from '../application/use-cases/manage-manual-ip-blacklist.usecase';
import { GetTopIpsSecurityUseCase } from '../application/use-cases/get-top-ips-security.usecase';
import { GetActiveBansSecurityUseCase } from '../application/use-cases/get-active-bans-security.usecase';
import { GetIpHistorySecurityUseCase } from '../application/use-cases/get-ip-history-security.usecase';
import { GetActivitySeriesSecurityUseCase } from '../application/use-cases/get-activity-series-security.usecase';
import { GetReasonDistributionSecurityUseCase } from '../application/use-cases/get-reason-distribution-security.usecase';
import { GetMethodDistributionSecurityUseCase } from '../application/use-cases/get-method-distribution-security.usecase';
import { GetTopRoutesSecurityUseCase } from '../application/use-cases/get-top-routes-security.usecase';
import { GetRiskScoreSecurityUseCase } from '../application/use-cases/get-risk-score-security.usecase';
import { GetRiskScoreByIpSecurityUseCase } from '../application/use-cases/get-risk-score-by-ip-security.usecase';
import { ExportSecurityAuditCsvUseCase } from '../application/use-cases/export-security-audit-csv.usecase';
import { GetSecurityReasonsCatalogUseCase } from '../application/use-cases/get-security-reasons-catalog.usecase';

@Module({
  imports: [TypeOrmModule.forFeature([IpViolation, IpBan, SecurityReasonCatalog])],
  controllers: [SecurityController],
  providers: [
    ResolveClientIpUseCase,
    CheckIpBanUseCase,
    RegisterIpViolationAndApplyPolicyUseCase,
    ManageManualIpBlacklistUseCase,
    GetTopIpsSecurityUseCase,
    GetActiveBansSecurityUseCase,
    GetIpHistorySecurityUseCase,
    GetActivitySeriesSecurityUseCase,
    GetReasonDistributionSecurityUseCase,
    GetMethodDistributionSecurityUseCase,
    GetTopRoutesSecurityUseCase,
    GetRiskScoreSecurityUseCase,
    GetRiskScoreByIpSecurityUseCase,
    ExportSecurityAuditCsvUseCase,
    GetSecurityReasonsCatalogUseCase,
  ],
  exports: [
    ResolveClientIpUseCase,
    CheckIpBanUseCase,
    RegisterIpViolationAndApplyPolicyUseCase,
    ManageManualIpBlacklistUseCase,
    GetTopIpsSecurityUseCase,
    GetActiveBansSecurityUseCase,
    GetIpHistorySecurityUseCase,
    GetActivitySeriesSecurityUseCase,
    GetReasonDistributionSecurityUseCase,
    GetMethodDistributionSecurityUseCase,
    GetTopRoutesSecurityUseCase,
    GetRiskScoreSecurityUseCase,
    GetRiskScoreByIpSecurityUseCase,
    ExportSecurityAuditCsvUseCase,
    GetSecurityReasonsCatalogUseCase,
  ],
})
export class SecurityModule {}
