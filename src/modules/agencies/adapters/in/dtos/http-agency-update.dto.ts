import { IsOptional, IsString, Length, MaxLength } from "class-validator";

export class HttpUpdateAgencyDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  departmentId?: string;

  @IsOptional()
  @IsString()
  @Length(4, 4)
  provinceId?: string;

  @IsOptional()
  @IsString()
  @Length(6, 6)
  districtId?: string;
}

