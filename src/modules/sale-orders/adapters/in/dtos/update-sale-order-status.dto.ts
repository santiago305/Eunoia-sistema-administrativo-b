import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { AgendaStatus } from "src/modules/sale-orders/domain/value-objects/agenda-status";
import { DeliveryStatus } from "src/modules/sale-orders/domain/value-objects/delivery-status";

export class UpdateSaleOrderStatusDto {
  @IsUUID()
  saleOrderId: string;

  @IsOptional()
  @IsEnum(AgendaStatus)
  agendaStatus?: AgendaStatus;

  @IsOptional()
  @IsEnum(DeliveryStatus)
  deliveryStatus?: DeliveryStatus | null;
}