import { IsBooleanString, IsEnum, IsOptional, IsUUID } from "class-validator";
import { DocType } from "src/shared/domain/value-objects/doc-type";

export class GetActiveSerieDto {
  @IsUUID()
  warehouseId: string;

  @IsOptional()
  @IsEnum(DocType)
  docType?: DocType;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;
}