import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from "class-validator";

class HttpExportSaleOrderColumnDto {
  @IsString()
  key: string;

  @IsString()
  label: string;
}

export class HttpExportSaleOrdersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpExportSaleOrderColumnDto)
  columns: HttpExportSaleOrderColumnDto[];

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsArray()
  filters?: Record<string, unknown>[];

  @IsOptional()
  @IsBoolean()
  useDateRange?: boolean;
}
