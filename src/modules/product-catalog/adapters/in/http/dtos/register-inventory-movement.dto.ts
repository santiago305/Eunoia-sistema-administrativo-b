import { IsEnum, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";
import { Direction } from "src/shared/domain/value-objects/direction";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ReferenceType } from "src/shared/domain/value-objects/reference-type";

export class RegisterProductCatalogInventoryMovementDto {
  @IsEnum(DocType)
  docType: DocType;

  @IsUUID()
  warehouseId: string;

  @IsNumber()
  quantity: number;

  @IsEnum(Direction)
  direction: Direction;

  @IsOptional()
  @IsUUID()
  locationId?: string | null;

  @IsOptional()
  @IsNumber()
  unitCost?: number | null;

  @IsOptional()
  @IsString()
  note?: string | null;

  @IsOptional()
  @IsUUID()
  createdBy?: string | null;

  @IsOptional()
  @IsUUID()
  referenceId?: string | null;

  @IsOptional()
  @IsEnum(ReferenceType)
  referenceType?: ReferenceType | null;
}


