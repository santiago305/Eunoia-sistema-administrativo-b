import { IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { SupplierDocType } from "src/modules/suppliers/domain/object-values/supplier-doc-type";
import { IsValidDocumentNumber } from "../document-number.validator";

export class HttpUpdateSupplierDto {

  @IsOptional()
  @IsEnum(SupplierDocType)
  documentType: SupplierDocType;

  @IsOptional()
  @IsValidDocumentNumber()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  tradeName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  leadTimeDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
