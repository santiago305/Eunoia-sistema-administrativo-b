import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength } from "class-validator";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import {
  CompanyPaymentAccountType,
  CompanyPaymentAccountUsage,
} from "../../../domain/entity/company-payment-account";

export class HttpCompanyPaymentAccountCreateDto {
  @IsUUID()
  companyId: string;

  @IsEnum(["BANK_ACCOUNT", "CREDIT_CARD", "CASH", "DIGITAL_WALLET"])
  type: CompanyPaymentAccountType;

  @IsOptional()
  @IsEnum(["OUTFLOW", "INFLOW", "BOTH"])
  usage?: CompanyPaymentAccountUsage;

  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  institutionName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  accountNumber?: string;

  @IsOptional()
  @Matches(/^\d{20}$/, { message: "El CCI debe contener 20 digitos" })
  cci?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/, { message: "Los ultimos cuatro digitos deben ser numericos" })
  @MaxLength(4)
  cardLastFour?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  walletProvider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  walletName?: string;

  @IsOptional()
  @Matches(/^\d{6,15}$/, { message: "El identificador de billetera debe contener entre 6 y 15 digitos" })
  walletPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  holderName?: string;

  @IsEnum(CurrencyType)
  currency: CurrencyType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
