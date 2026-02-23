import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";
import { SupplierDocType } from "src/modules/suppliers/domain/object-values/supplier-doc-type";

export class HttpCreateSupplierDto {
  @IsEnum(SupplierDocType)
  documentType: SupplierDocType;

  @ValidateIf((o) => o.documentType === SupplierDocType.DNI)
  @IsNumberString()
  @Length(8, 8)
  @ValidateIf((o) => o.documentType === SupplierDocType.RUC)
  @IsNumberString()
  @Length(11, 11)
  @ValidateIf((o) => o.documentType === SupplierDocType.CE)
  @IsString()
  @MinLength(1)
  documentNumber: string;

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
