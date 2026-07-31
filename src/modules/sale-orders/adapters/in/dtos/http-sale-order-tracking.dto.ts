import { ArrayMinSize, IsArray, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class HttpSaleOrderTrackingDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  saleOrderIds: string[];

  @IsOptional()
  @IsBoolean()
  preguide?: boolean;

  @IsOptional()
  @IsBoolean()
  prepared?: boolean;
}
