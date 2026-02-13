import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class HttpCreateWarehouseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  department: string;

  @IsString()
  @IsNotEmpty()
  province: string;

  @IsString()
  @IsNotEmpty()
  district: string;

  @IsOptional()
  @IsString()
  address?: string;
}
