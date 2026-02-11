import { IsOptional, IsEnum, IsUUID, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { DocStatus } from '../../../../domain/value-objects/doc-status';
import { DocType } from '../../../../domain/value-objects/doc-type';

export class ListDocumentsQueryDto {

  @IsOptional()
  @IsEnum(DocStatus)
  status?: DocStatus;

  @IsOptional()
  @IsEnum(DocType)
  docType?: DocType;

  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

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
}
