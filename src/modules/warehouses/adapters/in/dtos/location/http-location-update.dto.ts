import { IsOptional, IsString, IsUUID } from "class-validator";

export class HttpUpdateLocationDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
