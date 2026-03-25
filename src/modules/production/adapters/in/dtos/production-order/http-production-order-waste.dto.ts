import { IsArray, IsNumber, IsOptional, IsUUID, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class HttpProductionWasteItemDto {
  @IsUUID()
  stockItemId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  wasteQty: number;

  @IsOptional()
  @IsUUID()
  locationId?: string | null;

  @IsOptional()
  @IsUUID()
  productionItemId?: string;
}

export class HttpUpdateProductionWasteDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpProductionWasteItemDto)
  items: HttpProductionWasteItemDto[];
}
