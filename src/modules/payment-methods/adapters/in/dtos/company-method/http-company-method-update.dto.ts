import { IsBoolean, IsIn, IsOptional, IsUUID } from "class-validator";
import {
  COMPANY_METHOD_EVIDENCE_POLICIES,
  type CompanyMethodEvidencePolicy,
} from "src/modules/payment-methods/domain/services/payment-method-voucher-policy";

export class HttpCompanyMethodUpdateDto {
  @IsOptional()
  @IsUUID()
  methodId?: string;

  @IsOptional()
  @IsBoolean()
  requiresVoucher?: boolean;

  @IsOptional()
  @IsIn(COMPANY_METHOD_EVIDENCE_POLICIES)
  evidencePolicy?: CompanyMethodEvidencePolicy;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
