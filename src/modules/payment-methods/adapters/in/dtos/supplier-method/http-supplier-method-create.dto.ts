import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class HttpSupplierMethodCreateDto {
  @IsUUID()
  @IsNotEmpty()
  supplierId: string;

  @IsUUID()
  @IsNotEmpty()
  methodId: string;

  @IsOptional()
  @IsString()
  number?: string;
}
