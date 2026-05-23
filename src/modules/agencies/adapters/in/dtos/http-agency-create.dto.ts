import { IsBoolean, IsNotEmpty, IsOptional, IsString, Length, MaxLength } from "class-validator";

export class HttpCreateAgencyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

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
  @IsBoolean()
  isActive?: boolean;
}

