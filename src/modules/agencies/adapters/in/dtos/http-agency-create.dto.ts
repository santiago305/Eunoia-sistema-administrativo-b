import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Length, MaxLength, Min, ValidateNested } from "class-validator";

class HttpCreateAgencySubsidiaryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  alias: string;

  @IsString()
  @Length(2, 2)
  departmentId: string;

  @IsString()
  @Length(4, 4)
  provinceId: string;

  @IsString()
  @Length(6, 6)
  districtId: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class HttpCreateAgencyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => HttpCreateAgencySubsidiaryDto)
  subsidiaries: HttpCreateAgencySubsidiaryDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

