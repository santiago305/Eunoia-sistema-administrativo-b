import { Transform } from "class-transformer";
import { IsArray, IsOptional, IsString, Matches, MaxLength } from "class-validator";

const toStringArray = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const raw = Array.isArray(value) ? value : String(value).split(",");
  const normalized = raw.map((item) => String(item).trim()).filter(Boolean);
  return normalized.length ? Array.from(new Set(normalized)) : undefined;
};

export class ListUbigeoDistrictsQueryDto {
  @IsOptional()
  @Matches(/^\d{4}$/, { message: "provinceId debe tener 4 digitos" })
  provinceId?: string;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @Matches(/^\d{4}$/, { each: true, message: "Cada provinceId debe tener 4 digitos" })
  provinceIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(160)
  province?: string;

  @IsOptional()
  @Matches(/^\d{2}$/, { message: "departmentId debe tener 2 digitos" })
  departmentId?: string;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @Matches(/^\d{2}$/, { each: true, message: "Cada departmentId debe tener 2 digitos" })
  departmentIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(160)
  department?: string;
}
