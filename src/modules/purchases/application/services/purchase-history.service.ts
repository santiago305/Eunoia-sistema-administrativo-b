import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { PurchaseHistoryEventEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-history-event.entity";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";

export type PurchaseHistoryRecordInput = {
  purchaseId: string;
  eventType: string;
  description: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  performedByUserId?: string | null;
  targetUserId?: string | null;
  approvalRequestId?: string | null;
};

@Injectable()
export class PurchaseHistoryService {
  constructor(
    @InjectRepository(PurchaseHistoryEventEntity)
    private readonly historyRepo: Repository<PurchaseHistoryEventEntity>,
  ) {}

  async record(input: PurchaseHistoryRecordInput, tx?: TransactionContext): Promise<PurchaseHistoryEventEntity> {
    const repo = this.getRepository(tx);
    return repo.save(
      repo.create({
        purchaseId: input.purchaseId,
        eventType: input.eventType,
        description: input.description,
        oldValues: input.oldValues ?? null,
        newValues: input.newValues ?? null,
        metadata: input.metadata ?? {},
        performedByUserId: input.performedByUserId ?? null,
        targetUserId: input.targetUserId ?? null,
        approvalRequestId: input.approvalRequestId ?? null,
      }),
    );
  }

  async recordCreated(params: {
    purchaseId: string;
    performedByUserId?: string | null;
    snapshot: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    tx?: TransactionContext;
  }) {
    return this.record(
      {
        purchaseId: params.purchaseId,
        eventType: "PURCHASE_CREATED",
        description: "Se creó la compra.",
        newValues: params.snapshot,
        metadata: params.metadata,
        performedByUserId: params.performedByUserId ?? null,
      },
      params.tx,
    );
  }

  async recordUpdated(params: {
    purchaseId: string;
    performedByUserId?: string | null;
    oldValues: Record<string, unknown>;
    newValues: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    tx?: TransactionContext;
  }) {
    return this.record(
      {
        purchaseId: params.purchaseId,
        eventType: "PURCHASE_UPDATED",
        description: "Se actualizó la compra.",
        oldValues: params.oldValues,
        newValues: params.newValues,
        metadata: params.metadata,
        performedByUserId: params.performedByUserId ?? null,
      },
      params.tx,
    );
  }

  async recordPayment(params: {
    purchaseId: string;
    eventType: "PAYMENT_REGISTERED" | "PAYMENT_SCHEDULED" | "PAYMENT_REQUESTED" | "PAYMENT_APPROVED" | "PAYMENT_REJECTED" | "PAYMENT_DELETED";
    description: string;
    performedByUserId?: string | null;
    targetUserId?: string | null;
    approvalRequestId?: string | null;
    metadata?: Record<string, unknown>;
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
    tx?: TransactionContext;
  }) {
    return this.record(
      {
        purchaseId: params.purchaseId,
        eventType: params.eventType,
        description: params.description,
        performedByUserId: params.performedByUserId ?? null,
        targetUserId: params.targetUserId ?? null,
        approvalRequestId: params.approvalRequestId ?? null,
        metadata: params.metadata,
        oldValues: params.oldValues,
        newValues: params.newValues,
      },
      params.tx,
    );
  }

  private getRepository(tx?: TransactionContext): Repository<PurchaseHistoryEventEntity> {
    const manager = (tx as TypeormTransactionContext | undefined)?.manager as EntityManager | undefined;
    return manager ? manager.getRepository(PurchaseHistoryEventEntity) : this.historyRepo;
  }
}
