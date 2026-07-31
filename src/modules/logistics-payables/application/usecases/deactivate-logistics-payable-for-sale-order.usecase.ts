import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import { LOGISTICS_PAYABLES_REPOSITORY, LogisticsPayablesRepository } from '../../domain/ports/logistics-payables.repository';

@Injectable()
export class DeactivateLogisticsPayableForSaleOrderUsecase {
  constructor(@Inject(LOGISTICS_PAYABLES_REPOSITORY) private readonly repo: LogisticsPayablesRepository) {}

  async execute(input: { saleOrderId: string; tx?: TransactionContext }): Promise<void> {
    const linked = await this.repo.findActiveBySaleOrderId(input.saleOrderId, input.tx);
    if (!linked) return;
    if (Number(linked.amountPaid ?? 0) > 0) {
      throw new ConflictException('No se puede eliminar el pedido: el egreso logistico ya tiene pagos aprobados');
    }
    await this.repo.cancelPending({
      saleOrderId: input.saleOrderId,
      purchaseId: linked.purchaseId,
      accountPayableId: linked.accountPayableId,
    }, input.tx);
  }
}
