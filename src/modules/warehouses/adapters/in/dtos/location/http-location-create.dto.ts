import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class HttpCreateLocationDto {
  @IsUUID()
  warehouseId: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;
}
