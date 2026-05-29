import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  SALE_ORDER_REPOSITORY,
  SaleOrderRepository,
} from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { AgendaStatus } from "src/modules/sale-orders/domain/value-objects/agenda-status";
import { DeliveryStatus } from "src/modules/sale-orders/domain/value-objects/delivery-status";
import { DeliveryType } from "src/modules/sale-orders/domain/value-objects/delivery-type";

@Injectable()
export class UpdateSaleOrderStatusUsecase {
  constructor(
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
  ) {}
  async execute(input: {
    saleOrderId: string;
    agendaStatus?: AgendaStatus;
    deliveryStatus?: DeliveryStatus | null;
  }) {
    if (!input.agendaStatus && input.deliveryStatus === undefined) {
      throw new BadRequestException("Debes enviar al menos un estado para actualizar.");
    }
    const saleOrder = await this.saleOrderRepo.findById(input.saleOrderId);
    if (!saleOrder) {
      throw new NotFoundException("Pedido no encontrado.");
    }
    let deliveryStatus = input.deliveryStatus;
    if (input.agendaStatus === AgendaStatus.PROGRAMMED) {
      if (saleOrder.deliveryType === DeliveryType.ABONADO_ENVIO) {
        deliveryStatus = DeliveryStatus.WAITING;
      }
      if (saleOrder.deliveryType === DeliveryType.CONTRA_ENTREGA) {
        deliveryStatus = DeliveryStatus.IN_PROGRESS;
      }
    }
    return this.saleOrderRepo.updateStatuses({
      saleOrderId: input.saleOrderId,
      agendaStatus: input.agendaStatus,
      deliveryStatus,
    });
  }
}