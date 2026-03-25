import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from "class-validator";

export class HttpCreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Length(11, 11)
  ruc!: string;

  @IsOptional()
  @IsString()
  @MaxLength(6)
  ubigeo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  urbanization?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  codLocal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  solUser?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  solPass?: string;

  @IsOptional()
  @IsBoolean()
  production?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}