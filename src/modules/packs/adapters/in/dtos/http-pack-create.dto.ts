import { Type } from "class-transformer";
import { ArrayMinSize, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateNested } from "class-validator";

export class HttpCreatePackItemDto {
  @IsUUID()
  skuId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;
}

export class HttpCreatePackDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  total: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => HttpCreatePackItemDto)
  items: HttpCreatePackItemDto[];
}

