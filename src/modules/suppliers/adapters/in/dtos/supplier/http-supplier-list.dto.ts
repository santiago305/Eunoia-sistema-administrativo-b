import { Transform, Type } from "class-transformer";
import { IsBooleanString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { SupplierDocType } from "src/modules/suppliers/domain/object-values/supplier-doc-type";

export class ListSupplierQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsBooleanString()
  isActive?: string;

  @IsOptional()
  @IsEnum(SupplierDocType)
  documentType?: SupplierDocType;

  @IsOptional()
  @IsString()
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
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  q?: string;
}
