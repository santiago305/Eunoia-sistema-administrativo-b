import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { PaymentDocument } from "src/modules/payments/domain/entity/payment-document";
import { PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";
import { PaymentDocumentEntity } from "../entities/payment-document.entity";

@Injectable()
export class PaymentDocumentTypeormRepository implements PaymentDocumentRepository {
  constructor(
    @InjectRepository(PaymentDocumentEntity)
    private readonly repo: Repository<PaymentDocumentEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(PaymentDocumentEntity);
  }

  private toDomain(row: PaymentDocumentEntity): PaymentDocument {
    return new PaymentDocument(
      row.id,
      row.method,
      row.date,
      row.currency,
      Number(row.amount),
      row.fromDocumentType,
      row.operationNumber ?? undefined,
      row.note ?? undefined,
    );
  }

  async findById(payDocId: string, tx?: TransactionContext): Promise<PaymentDocument | null> {
    const row = await this.getRepo(tx).findOne({ where: { id: payDocId } });
    return row ? this.toDomain(row) : null;
  }

  async create(document: PaymentDocument, tx?: TransactionContext): Promise<PaymentDocument> {
    const repo = this.getRepo(tx);
    const row = repo.create({
      id: document.payDocId,
      method: document.method,
      date: document.date,
      operationNumber: document.operationNumber ?? null,
      currency: document.currency,
      amount: document.amount,
      note: document.note ?? null,
      fromDocumentType: document.fromDocumentType,
    });
    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  async deleteById(payDocId: string, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).delete({ id: payDocId });
  }
}
