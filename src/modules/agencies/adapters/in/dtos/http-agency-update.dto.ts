import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Length, MaxLength, Min, ValidateNested } from "class-validator";

class HttpUpdateAgencySubsidiaryDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
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

export class HttpUpdateAgencyDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpUpdateAgencySubsidiaryDto)
  subsidiaries?: HttpUpdateAgencySubsidiaryDto[];
}

