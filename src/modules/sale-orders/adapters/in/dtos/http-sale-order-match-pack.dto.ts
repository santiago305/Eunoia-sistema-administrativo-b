import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class HttpSaleOrderMatchPackComponentDto {
  @IsUUID()
  skuId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity: number;
}

export class HttpSaleOrderMatchPackDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => HttpSaleOrderMatchPackComponentDto)
  components: HttpSaleOrderMatchPackComponentDto[];
}
