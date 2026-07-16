import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { SaleOrderGetOutput } from "../../dtos/sale-order-search/output/sale-order-search-state.output";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SaleOrderEditPolicyService } from "../../services/sale-order-edit-policy.service";


@Injectable()
export class GetSaleOrderUsecase {
  constructor(
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderQueryRepo: SaleOrderRepository,
    private readonly editPolicy: SaleOrderEditPolicyService,
  ) {}

  async execute(input: { saleOrderId: string }): Promise<SaleOrderGetOutput> {
    const order = await this.saleOrderQueryRepo.findById(input.saleOrderId);
    if (!order) {
      throw new BadRequestException("Pedido no encontrado");
    }
    const editPolicy = await this.editPolicy.resolve({
      id: order.id,
      workflowId: order.workflow?.id ?? null,
      currentStateId: order.currentState?.id ?? null,
      reserveBool: order.reserveBool,
    });
    return { ...order, editPolicy };
  }
}
