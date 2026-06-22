import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { CompanyPaymentAccountType } from "../../../domain/entity/company-payment-account";

export class HttpCompanyPaymentAccountUpdateDto {
  @IsOptional()
  @IsEnum(["BANK_ACCOUNT", "CREDIT_CARD", "CASH", "DIGITAL_WALLET"])
  type?: CompanyPaymentAccountType;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  bankName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  accountNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  cardLastFour?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  walletName?: string | null;

  @IsOptional()
  @IsEnum(CurrencyType)
  currency?: CurrencyType;
}

export class HttpCompanyPaymentAccountSetActiveDto {
  @IsBoolean()
  isActive: boolean;
}
