import { IsBoolean, IsEnum, IsOptional, IsUUID } from "class-validator";
import { Transform } from "class-transformer";
import { DocType } from "src/modules/inventory/domain/value-objects/doc-type";

export class DocumentSerieSearchDto {
  @IsOptional()
  @IsEnum(DocType)
  docType?: DocType;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @IsUUID()
  warehouseId: string;
}
