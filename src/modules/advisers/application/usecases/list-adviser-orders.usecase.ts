import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaleOrderEntity } from 'src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order.entity';
import { adviserOrderPeriodSql, resolveAdviserPeriod } from '../support/adviser-period';

@Injectable()
export class ListAdviserOrdersUsecase {
  constructor(
    @InjectRepository(SaleOrderEntity)
    private readonly saleOrders: Repository<SaleOrderEntity>,
  ) {}

  async execute(input: {
    adviserUserId: string;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const page = Math.max(1, Number(input.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(input.limit ?? 25)));
    const period = resolveAdviserPeriod(input.startDate, input.endDate);
    const periodParams = { periodStart: period.startDate, periodEnd: period.endDate };

    const base = this.saleOrders
      .createQueryBuilder('o')
      .leftJoin('clients', 'c', 'c.id = o.client_id')
      .leftJoin('workflow_states', 'ws', 'ws.id = o.current_state_id')
      .leftJoin('sale_order_states', 's', 's.id = ws.sale_order_state_id')
      .where('o.assigned_by = :adviserUserId', { adviserUserId: input.adviserUserId })
      .andWhere('o.is_active = true')
      .andWhere(adviserOrderPeriodSql('o'), periodParams);

    const total = await base.clone().getCount();
    const rows = await base
      .select('o.id', 'id')
      .addSelect('o.serie', 'serie')
      .addSelect('o.correlative', 'correlative')
      .addSelect('o.created_at', 'createdAt')
      .addSelect('c.full_name', 'clientName')
      .addSelect('o.total', 'total')
      .addSelect('(SELECT COALESCE(SUM(sp.amount), 0) FROM sale_payments sp WHERE sp.sale_order_id = o.id)', 'collectedTotal')
      .addSelect('s.name', 'stateName')
      .addSelect('s.color', 'stateColor')
      .orderBy('o.created_at', 'DESC')
      .addOrderBy('o.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getRawMany();

    return {
      items: rows.map((row) => ({
        id: row.id,
        serie: row.serie ?? null,
        correlative: row.correlative == null ? null : Number(row.correlative),
        createdAt: row.createdAt ?? row.createdat,
        clientName: row.clientName ?? row.clientname ?? 'Sin cliente',
        total: Number(row.total ?? 0),
        collectedTotal: Number(row.collectedTotal ?? row.collectedtotal ?? 0),
        stateName: row.stateName ?? row.statename ?? 'Sin estado',
        stateColor: row.stateColor ?? row.statecolor ?? null,
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      period,
    };
  }
}
