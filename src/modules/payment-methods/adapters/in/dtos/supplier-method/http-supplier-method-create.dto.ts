import { IsNotEmpty, IsUUID } from "class-validator";

export class HttpSupplierMethodCreateDto {
  @IsUUID()
  @IsNotEmpty()
  supplierId: string;

  @IsUUID()
  @IsNotEmpty()
  methodId: string;
}
