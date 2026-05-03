import { IsArray, IsBoolean, IsDateString, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class HttpExportColumnDto {
  @IsString()
  key: string;

  @IsString()
  label: string;
}

export class HttpExportPurchaseOrdersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpExportColumnDto)
  columns: HttpExportColumnDto[];

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsArray()
  filters?: Record<string, unknown>[];

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsBoolean()
  useDateRange?: boolean;
}
