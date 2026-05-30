import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";
import { DeliveryType } from "src/modules/sale-orders/domain/value-objects/delivery-type";

export class HttpSaleOrderItemComponentDto {
  @IsUUID()
  skuId: string;

  @IsNumber()
  @Min(0.000001)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @Min(0)
  total: number;

  @IsOptional()
  @IsUUID()
  referencePackItemId?: string;
  
  @IsOptional()
  @IsString()
  skuLabel?: string;

  @IsOptional()
  @IsString()
  skuCode?: string;

  @IsOptional()
  @IsString()
  skuImage?: string;
}

export class HttpSaleOrderItemDto {
  @IsNumber()
  @Min(0.000001)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @Min(0)
  total: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  referencePackId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => HttpSaleOrderItemComponentDto)
  components?: HttpSaleOrderItemComponentDto[];
}

export class HttpSalePaymentDto {
  @IsUUID()
  bankAccountId: string;

  @IsString()
  @IsNotEmpty()
  method: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  operationNumber?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class HttpSaleOrderCreateDto {
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
  deliveryCost?: number;
  
  @IsOptional()
  subTotal?: number;
  
  @IsOptional()
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
