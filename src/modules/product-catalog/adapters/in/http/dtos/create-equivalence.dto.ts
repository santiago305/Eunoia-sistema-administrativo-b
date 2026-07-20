import { IsNumber, IsPositive, IsUUID } from "class-validator";

export class CreateProductCatalogEquivalenceDto {
  @IsUUID()
  fromUnitId: string;

  @IsUUID()
  toUnitId: string;

  @IsNumber({ maxDecimalPlaces: 6 })
  @IsPositive()
  factor: number;
}
