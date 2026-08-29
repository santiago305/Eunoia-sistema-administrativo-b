import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { fixMojibake } from 'src/modules/excel/application/orders-import/normalization';

const normalizeExternalName = ({ value }: { value: unknown }) =>
  fixMojibake(String(value ?? ''))
    .trim()
    .replace(/\s+/g, ' ');

export class ListSaleOrderAdviserImportAliasesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  q?: string;
}

export class CreateSaleOrderAdviserImportAliasDto {
  @Transform(normalizeExternalName)
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  externalName: string;

  @IsUUID()
  adviserUserId: string;
}

export class UpdateSaleOrderAdviserImportAliasDto extends CreateSaleOrderAdviserImportAliasDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  replaceDeleted?: boolean;
}

export class ResolveSaleOrderImportAdvisersDto {
  @IsArray()
  @ArrayMaxSize(1000)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  values: string[];
}
