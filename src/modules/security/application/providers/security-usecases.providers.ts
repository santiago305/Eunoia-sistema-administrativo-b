import { CheckIpBanUseCase } from '../use-cases/check-ip-ban.usecase';
import { ExportSecurityAuditCsvUseCase } from '../use-cases/export-security-audit-csv.usecase';
import { GetActiveBansSecurityUseCase } from '../use-cases/get-active-bans-security.usecase';
import { GetActivitySeriesSecurityUseCase } from '../use-cases/get-activity-series-security.usecase';
import { GetIpHistorySecurityUseCase } from '../use-cases/get-ip-history-security.usecase';
import { GetMethodDistributionSecurityUseCase } from '../use-cases/get-method-distribution-security.usecase';
import { GetReasonDistributionSecurityUseCase } from '../use-cases/get-reason-distribution-security.usecase';
import { GetRiskScoreByIpSecurityUseCase } from '../use-cases/get-risk-score-by-ip-security.usecase';
import { GetRiskScoreSecurityUseCase } from '../use-cases/get-risk-score-security.usecase';
import { GetSecurityReasonsCatalogUseCase } from '../use-cases/get-security-reasons-catalog.usecase';
import { GetTopIpsSecurityUseCase } from '../use-cases/get-top-ips-security.usecase';
import { GetTopRoutesSecurityUseCase } from '../use-cases/get-top-routes-security.usecase';
import { ManageManualIpBlacklistUseCase } from '../use-cases/manage-manual-ip-blacklist.usecase';
import { RegisterIpViolationAndApplyPolicyUseCase } from '../use-cases/register-ip-violation-and-apply-policy.usecase';
import { ResolveClientIpUseCase } from '../use-cases/resolve-client-ip.usecase';

export const securityUseCasesProviders = [
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
];
