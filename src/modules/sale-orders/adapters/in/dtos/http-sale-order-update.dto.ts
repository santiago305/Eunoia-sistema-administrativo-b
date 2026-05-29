import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";
import { DeliveryType } from "src/modules/sale-orders/domain/value-objects/delivery-type";
import { HttpSaleOrderItemComponentDto, HttpSaleOrderItemDto, HttpSalePaymentDto } from "./http-sale-order-create.dto";

export class HttpSaleOrderUpdateDto {
  @IsUUID()
  warehouseId: string;

  @IsUUID()
  clientId: string;

  @IsOptional()
  @IsString()
  agencyDetail?: string;

  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @IsOptional()
  @IsDateString()
  scheduleDate?: string;

  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  subTotal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  total?: number;

  @IsOptional()
  @IsString()
  deliveryType?: DeliveryType;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => HttpSaleOrderItemDto)
  items: HttpSaleOrderItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpSalePaymentDto)
  payments?: HttpSalePaymentDto[];
}

export { HttpSaleOrderItemComponentDto, HttpSaleOrderItemDto, HttpSalePaymentDto };

