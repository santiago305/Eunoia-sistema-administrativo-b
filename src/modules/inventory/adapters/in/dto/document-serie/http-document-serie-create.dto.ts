import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { DocType } from '../../../../domain/value-objects/doc-type';

export class CreateDocumentSerieDto {

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(DocType)
  docType: DocType;

  @IsUUID()
  warehouseId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  nextNumber?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  padding?: number;

  @IsOptional()
  @IsString()
  separator?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
