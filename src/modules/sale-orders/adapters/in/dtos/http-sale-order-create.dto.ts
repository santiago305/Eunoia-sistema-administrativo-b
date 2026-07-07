import { Transform, Type } from "class-transformer";
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

export class HttpSaleOrderItemComponentDto {
  @IsUUID()
  @IsOptional()
  id?: string;
  
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

  @IsUUID()
  @IsOptional()
  id?: string;

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

  @IsOptional()
  @IsString()
  paymentPhoto?: string | null;

}

export class HttpSaleOrderCreateDto {
  @IsOptional()
  @Transform(({ value }) => (value === "" || value === null ? undefined : value))
  @IsUUID()
  warehouseId?: string;

  @IsUUID()
  clientId: string;

  @IsOptional()
  @IsUUID()
  agencySubsidiaryId?: string;

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
  note?: string;

  @IsOptional()
  @IsString()
  advertisingCode?: string | null;

  @IsOptional()
  @IsString()
  observation?: string | null;

  @IsOptional()
  @IsDateString()
  sendDate?: string | null;

  @IsOptional()
  @IsString()
  sendPhoto?: string | null;

  @IsOptional()
  @IsString()
  sendCode?: string | null;

  @IsOptional()
  @IsString()
  sendAddress?: string | null;

  @IsOptional()
  @IsUUID()
  assignedBy?: string | null;

  @IsUUID()
  workflowId: string;

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
