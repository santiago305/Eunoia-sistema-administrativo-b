import { IsNumber, IsUUID } from "class-validator";

export class CreateProductCatalogEquivalenceDto {
  @IsUUID()
  fromUnitId: string;

  @IsUUID()
  toUnitId: string;

  @IsNumber()
  factor: number;
}
