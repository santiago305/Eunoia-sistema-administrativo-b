import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  Equals,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { DocType } from 'src/modules/inventory/domain/value-objects/doc-type';

export class HttpCreateAddItemPostOutItemDto {
  @IsUUID()
  itemId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsUUID()
  fromLocationId?: string;

  @IsOptional()
  @IsUUID()
  toLocationId?: string;
}

export class HttpCreateAddItemPostOutDto {
  @Equals(DocType.OUT, {
    message: 'Tipo de documento invalido',
  })
  docType: DocType;

  @IsUUID()
  serieId: string;

  @IsUUID()
  fromWarehouseId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsNotEmpty()
  note?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => HttpCreateAddItemPostOutItemDto)
  items: HttpCreateAddItemPostOutItemDto[];
}
