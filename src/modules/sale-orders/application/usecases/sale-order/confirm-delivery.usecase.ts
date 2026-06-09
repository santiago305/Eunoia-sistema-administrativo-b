import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { CLIENT_REPOSITORY, ClientRepository } from "src/modules/clients/domain/ports/client.repository";
import { ClientType } from "src/modules/clients/domain/object-values/client-type";
import { SaleOrderWorkflowTransitionService } from "src/modules/workflow/application/services/sale-order-workflow-transition.service";

@Injectable()
export class ConfirmSaleOrderDeliveryUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    @Inject(CLIENT_REPOSITORY)
    private readonly clientRepo: ClientRepository,
    private readonly workflowTransitionService: SaleOrderWorkflowTransitionService,
  ) {}

  async execute(input: { saleOrderId: string }) {
    return this.uow.runInTransaction(async (tx) => {
      const order = await this.saleOrderRepo.findByIdForUpdate(input.saleOrderId, tx);
      if (!order) throw new BadRequestException("Pedido no encontrado");

      const updated = await this.workflowTransitionService.advance(
        {
          saleOrderId: order.id,
          executedBy: order.createdBy,
          transitionCode: "CONFIRM_DELIVERY",
          metadata: { source: "confirm-delivery.usecase" },
        },
        tx,
      );

      const deliveredOrdersCount = await this.saleOrderRepo.countSaleOrdersByClientId(order.clientId, tx);
      if (deliveredOrdersCount === 1) {
        await this.clientRepo.update({ clientId: order.clientId, type: ClientType.NEW }, tx);
      } else if (deliveredOrdersCount > 1) {
        await this.clientRepo.update({ clientId: order.clientId, type: ClientType.REPURCHASE }, tx);
      } else {
        await this.clientRepo.update({ clientId: order.clientId, type: ClientType.LAGGING }, tx);
      }

      return { saleOrderId: updated.id, currentStateId: updated.currentStateId };
    });
  }
}
