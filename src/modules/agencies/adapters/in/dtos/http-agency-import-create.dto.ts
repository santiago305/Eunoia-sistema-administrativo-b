import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

class HttpAgencyImportCreateRowDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  department: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  province: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  district: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  alias: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number | null;
}

export class HttpAgencyImportCreateDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => HttpAgencyImportCreateRowDto)
  rows: HttpAgencyImportCreateRowDto[];
}
