import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from 'src/modules/sale-orders/domain/ports/sale-order.repository';

export type SetSaleOrdersTrackingInput = {
  saleOrderIds: string[];
  preguide?: boolean;
  prepared?: boolean;
  executedBy: string;
};

@Injectable()
export class SetSaleOrdersTrackingUsecase {
  constructor(@Inject(SALE_ORDER_REPOSITORY) private readonly repo: SaleOrderRepository) {}

  assertActiveOrder(order: { isActive: boolean }) {
    if (!order.isActive) throw new ConflictException('Los pedidos eliminados son de solo lectura');
  }

  async execute(input: SetSaleOrdersTrackingInput) {
    const ids = input.saleOrderIds ?? [];
    if (!ids.length || input.preguide === undefined && input.prepared === undefined) {
      throw new BadRequestException('Debe indicar preguía o preparación');
    }
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('No se permiten pedidos repetidos');
    }

    const changed = await this.repo.setTrackingByIds({
      saleOrderIds: ids,
      preguide: input.preguide,
      prepared: input.prepared,
    }, input.executedBy, undefined);
    const byId = new Map(changed.map((row) => [row.saleOrderId, row]));
    const results = ids.map((saleOrderId) => {
      const row = byId.get(saleOrderId);
      return row
        ? { saleOrderId, status: 'success' as const, changedFields: row.changedFields }
        : { saleOrderId, status: 'failed' as const, message: 'Pedido no encontrado o eliminado' };
    });
    const succeeded = results.filter((row) => row.status === 'success').length;
    return {
      type: 'success' as const,
      message: 'Seguimiento actualizado',
      data: {
        requested: ids.length,
        succeeded,
        failed: ids.length - succeeded,
        partiallyCompleted: succeeded > 0 && succeeded < ids.length,
        results,
      },
    };
  }
}
