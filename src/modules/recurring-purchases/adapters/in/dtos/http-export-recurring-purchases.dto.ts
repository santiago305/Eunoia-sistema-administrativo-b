import { Type } from "class-transformer";
import { IsArray, IsOptional, IsString, ValidateNested } from "class-validator";

class HttpExportRecurringPurchaseColumnDto {
  @IsString()
  key: string;

  @IsString()
  label: string;
}

export class HttpExportRecurringPurchasesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpExportRecurringPurchaseColumnDto)
  columns: HttpExportRecurringPurchaseColumnDto[];

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsArray()
  filters?: Record<string, unknown>[];
}
