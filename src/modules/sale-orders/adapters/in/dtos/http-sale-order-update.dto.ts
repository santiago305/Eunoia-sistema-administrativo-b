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
import { HttpSaleOrderItemComponentDto, HttpSaleOrderItemDto, HttpSalePaymentDto } from "./http-sale-order-create.dto";

export class HttpSaleOrderUpdateDto {
  
  @IsUUID()
  warehouseId: string;

  @IsUUID()
  clientId: string;
  
  @IsUUID()
  @IsOptional()
  workflowId: string;

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
  note?: string;

  @IsOptional()
  @IsString()
  advertisingCode?: string | null;

  @IsOptional()
  @IsString()
  observation?: string | null;

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
  
  @IsOptional()
  currentState?:string;
}

export { HttpSaleOrderItemComponentDto, HttpSaleOrderItemDto, HttpSalePaymentDto };

