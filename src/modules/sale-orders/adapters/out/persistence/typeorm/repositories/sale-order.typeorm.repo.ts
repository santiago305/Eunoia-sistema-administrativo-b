import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { SaleOrderEntity } from "../entities/sale-order.entity";
import { SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SaleOrder } from "src/modules/sale-orders/domain/entities/sale-order";

@Injectable()
export class SaleOrderTypeormRepository implements SaleOrderRepository {
  constructor(
    @InjectRepository(SaleOrderEntity)
    private readonly repo: Repository<SaleOrderEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private toDomain(row: SaleOrderEntity): SaleOrder {
    return new SaleOrder(
      row.id,
      row.serie ?? null,
      row.correlative ?? null,
      row.warehouseId,
      row.clientId,
      row.agencyDetail ?? null,
      row.sourceId ?? null,
      row.scheduleDate ?? null,
      row.deliveryDate ?? null,
      row.deliveryType ?? null,
      Number(row.subTotal ?? 0),
      Number(row.deliveryCost ?? 0),
      Number(row.total ?? 0),
      row.note ?? null,
      row.createdBy,
      row.agendaStatus,
      row.deliveryStatus ?? null,
      Boolean(row.isActive),
      row.createdAt,
      row.updatedAt ?? null,
    );
  }

  async create(input: Parameters<SaleOrderRepository["create"]>[0], tx?: TransactionContext): Promise<SaleOrder> {
    const manager = this.getManager(tx);
    const saved = await manager.getRepository(SaleOrderEntity).save({
      serie: input.serie ?? null,
      correlative: input.correlative ?? null,
      warehouseId: input.warehouseId,
      clientId: input.clientId,
      agencyDetail: input.agencyDetail ?? null,
      sourceId: input.sourceId ?? null,
      scheduleDate: input.scheduleDate ?? null,
      deliveryDate: input.deliveryDate ?? null,
      deliveryType: input.deliveryType ?? null,
      subTotal: input.subTotal,
      deliveryCost: input.deliveryCost,
      total: input.total,
      note: input.note ?? null,
      createdBy: input.createdBy,
      agendaStatus: input.agendaStatus,
      deliveryStatus: input.deliveryStatus ?? null,
      isActive: input.isActive ?? true,
    });
    return this.toDomain(saved);
  }
}
