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
import { normalizeSourceRecognitionCode } from "../../../application/support/source-recognition-parser";

const normalizeCode = ({ value }: { value: unknown }) =>
  normalizeSourceRecognitionCode(value);

export class ListSourceRecognitionCodesDto {
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

export class CreateSourceRecognitionCodeDto {
  @Transform(normalizeCode)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/^[A-Z0-9]+(?: [A-Z0-9]+)*$/, {
    message: "El código solo puede contener letras, números y espacios simples",
  })
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  description?: string | null;
}

export class UpdateSourceRecognitionCodeDto extends CreateSourceRecognitionCodeDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  replaceDeleted?: boolean;
}
