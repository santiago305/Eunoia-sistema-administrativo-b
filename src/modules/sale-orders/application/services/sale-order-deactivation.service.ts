import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { SaleOrderRepository, SALE_ORDER_REPOSITORY } from '../../domain/ports/sale-order.repository';
import { SaleOrderEditPolicyService } from './sale-order-edit-policy.service';
import { SaleOrderWorkflowActionRunnerService } from 'src/modules/workflow/application/services/sale-order-workflow-action-runner.service';
import { ACTIONS } from 'src/modules/workflow/domain/constants/workflow-action.constants';
import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import { DeactivateLogisticsPayableForSaleOrderUsecase } from 'src/modules/logistics-payables/application/usecases/deactivate-logistics-payable-for-sale-order.usecase';
import { SaleOrderStockConsumptionReversalService } from 'src/modules/workflow/application/services/sale-order-stock-consumption-reversal.service';

@Injectable()
export class SaleOrderDeactivationService {
  constructor(
    @Inject(SALE_ORDER_REPOSITORY) private readonly saleOrderRepo: SaleOrderRepository,
    private readonly editPolicy: SaleOrderEditPolicyService,
    private readonly workflowRunner: SaleOrderWorkflowActionRunnerService,
    private readonly stockConsumptionReversal: SaleOrderStockConsumptionReversalService,
    private readonly logisticsPayable: DeactivateLogisticsPayableForSaleOrderUsecase,
  ) {}

  async deactivate(saleOrderId: string, executedBy: string, tx?: TransactionContext): Promise<void> {
    const order = await this.saleOrderRepo.findByIdForUpdate(saleOrderId, tx);
    if (!order || !order.isActive) throw new ConflictException('El pedido ya esta eliminado o no existe');
    if (order.warehouseId) {
      await this.stockConsumptionReversal.restoreAndRelease(order, executedBy, tx as TransactionContext);
    }
    if (await this.stockConsumptionReversal.hasUnreversedConsumption(order.id, tx as TransactionContext)) {
      throw new ConflictException('No se puede eliminar el pedido porque tiene consumo de stock sin compensar');
    }
    const policy = await this.editPolicy.resolve(order, tx);
    if (policy.stockStatus === 'RESERVED') {
      await this.workflowRunner.run(order, [{
        id: 'deactivation-revert-stock', transitionId: 'deactivation', type: ACTIONS.REVERT_STOCK,
        config: {}, position: 0, branch: 'THEN',
      }] as any, tx as any, executedBy);
    }
    await this.logisticsPayable.execute({ saleOrderId, tx });
    await this.saleOrderRepo.setActiveByIds({ saleOrderIds: [saleOrderId], isActive: false }, tx);
    await this.saleOrderRepo.createAudit({ saleOrderId, executedBy, actionExecution: 'delete' }, tx);
  }
}
