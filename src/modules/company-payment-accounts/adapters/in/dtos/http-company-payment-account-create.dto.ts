import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { CompanyPaymentAccountType } from "../../../domain/entity/company-payment-account";

export class HttpCompanyPaymentAccountCreateDto {
  @IsUUID()
  companyId: string;

  @IsEnum(["BANK_ACCOUNT", "CREDIT_CARD", "CASH", "DIGITAL_WALLET"])
  type: CompanyPaymentAccountType;

  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  accountNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  cardLastFour?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  walletName?: string;

  @IsEnum(CurrencyType)
  currency: CurrencyType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
