import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

const normalizeCode = ({ value }: { value: unknown }) =>
  String(value ?? "").trim().toUpperCase();

export class ListSaleOrderSkuRecognitionCodesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

export class CreateSaleOrderSkuRecognitionCodeDto {
  @Transform(normalizeCode)
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  @Matches(/^[A-Z0-9]+$/, {
    message: "El código solo puede contener letras y números",
  })
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  description?: string | null;
}

export class UpdateSaleOrderSkuRecognitionCodeDto extends CreateSaleOrderSkuRecognitionCodeDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  replaceDeleted?: boolean;
}
