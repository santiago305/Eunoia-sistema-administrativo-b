import { Type } from "class-transformer";
import { IsArray, IsOptional, IsString, ValidateNested } from "class-validator";

class HttpExportAgencyColumnDto {
  @IsString()
  key: string;

  @IsString()
  label: string;
}

export class HttpExportAgenciesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpExportAgencyColumnDto)
  columns: HttpExportAgencyColumnDto[];

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsArray()
  filters?: Record<string, unknown>[];
}
