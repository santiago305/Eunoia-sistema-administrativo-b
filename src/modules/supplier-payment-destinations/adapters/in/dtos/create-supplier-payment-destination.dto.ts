import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Length } from "class-validator";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { SupplierPaymentDestinationType } from "../../../domain/entity/supplier-payment-destination";

export class CreateSupplierPaymentDestinationDto {
  @IsUUID() supplierId: string;
  @IsUUID() methodId: string;
  @IsEnum(["BANK_ACCOUNT", "DIGITAL_WALLET", "CARD", "CASH"]) type: SupplierPaymentDestinationType;
  @IsEnum(CurrencyType) currency: CurrencyType;
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() institutionName?: string;
  @IsOptional() @IsString() providerName?: string;
  @IsOptional() @IsString() accountNumber?: string;
  @IsOptional() @IsString() @Length(20, 20) cci?: string;
  @IsOptional() @IsString() @Length(6, 15) walletIdentifier?: string;
  @IsOptional() @IsString() holderName?: string;
  @IsOptional() @IsString() holderDocument?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsBoolean() requiresManualReview?: boolean;
}
