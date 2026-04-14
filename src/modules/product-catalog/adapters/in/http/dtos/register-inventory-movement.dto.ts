import { Type } from "class-transformer";
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";
import { Direction } from "src/shared/domain/value-objects/direction";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ReferenceType } from "src/shared/domain/value-objects/reference-type";

class RegisterInventoryMovementItemDto {
  @IsUUID()
  skuId: string;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsNumber()
  unitCost?: number | null;

  @IsOptional()
  @IsUUID()
  locationId?: string | null;
}

export class RegisterProductCatalogInventoryMovementDto {
  @IsEnum(DocType)
  docType: DocType;

  @IsUUID()
  warehouseId: string;

  @IsOptional()
  @IsUUID()
  locationId?: string | null;

  @IsOptional()
  @IsString()
  note?: string | null;

  @IsEnum(Direction)
  direction: Direction;

  @IsOptional()
  @IsUUID()
  referenceId?: string | null;

  @IsOptional()
  @IsEnum(ReferenceType)
  referenceType?: ReferenceType | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegisterInventoryMovementItemDto)
  items: RegisterInventoryMovementItemDto[];
}


