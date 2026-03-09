import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IpViolation } from '../adapters/out/persistence/typeorm/entities/ip-violation.entity';
import { IpBan } from '../adapters/out/persistence/typeorm/entities/ip-ban.entity';
import { SecurityController } from '../adapters/in/controllers/security.controller';
import { ResolveClientIpUseCase } from '../application/use-cases/resolve-client-ip.usecase';
import { CheckIpBanUseCase } from '../application/use-cases/check-ip-ban.usecase';
import { RegisterIpViolationAndApplyPolicyUseCase } from '../application/use-cases/register-ip-violation-and-apply-policy.usecase';
import { ManageManualIpBlacklistUseCase } from '../application/use-cases/manage-manual-ip-blacklist.usecase';
import { GetIpSecurityInsightsUseCase } from '../application/use-cases/get-ip-security-insights.usecase';

@Module({
  imports: [TypeOrmModule.forFeature([IpViolation, IpBan])],
  controllers: [SecurityController],
  providers: [
    ResolveClientIpUseCase,
    CheckIpBanUseCase,
    RegisterIpViolationAndApplyPolicyUseCase,
    ManageManualIpBlacklistUseCase,
    GetIpSecurityInsightsUseCase,
  ],
  exports: [
    ResolveClientIpUseCase,
    CheckIpBanUseCase,
    RegisterIpViolationAndApplyPolicyUseCase,
    ManageManualIpBlacklistUseCase,
    GetIpSecurityInsightsUseCase,
  ],
})
export class SecurityModule {}
