import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { SaleOrderClientCommand } from '../../../application/dtos/unified-sale-order.input';
import { HttpSaleOrderItemDto } from './http-sale-order-create.dto';

export class HttpUnifiedSalePaymentDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  clientKey: string;

  @IsOptional()
  @IsUUID()
  bankAccountId?: string | null;

  @IsString()
  method: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  operationNumber?: string | null;

  @IsOptional()
  @IsString()
  note?: string | null;
}

export class HttpSaveSaleOrderWithClientDto {
  @IsObject()
  client: SaleOrderClientCommand;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsUUID()
  workflowId: string;

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
  @IsNumber()
  @Min(0)
  deliveryCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

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
  sendCode?: string | null;

  @IsOptional()
  @IsString()
  sendAddress?: string | null;

  @IsOptional()
  @IsUUID()
  assignedBy?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => HttpSaleOrderItemDto)
  items: HttpSaleOrderItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpUnifiedSalePaymentDto)
  payments?: HttpUnifiedSalePaymentDto[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  removedAttachmentIds?: string[];
}
