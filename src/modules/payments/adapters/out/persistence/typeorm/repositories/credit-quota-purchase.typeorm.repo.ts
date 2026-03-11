import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { CreditQuotaPurchase } from "src/modules/payments/domain/entity/credit-quota-purchase";
import { CreditQuotaPurchaseRepository } from "src/modules/payments/domain/ports/credit-quota-purchase.repository";
import { CreditQuotaPurchaseEntity } from "../entities/credit-quota-purchase.entity";

@Injectable()
export class CreditQuotaPurchaseTypeormRepository implements CreditQuotaPurchaseRepository {
  constructor(
    @InjectRepository(CreditQuotaPurchaseEntity)
    private readonly repo: Repository<CreditQuotaPurchaseEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(CreditQuotaPurchaseEntity);
  }

  private toDomain(row: CreditQuotaPurchaseEntity): CreditQuotaPurchase {
    return new CreditQuotaPurchase(row.quotaId, row.poId);
  }

  async findByQuotaId(quotaId: string, tx?: TransactionContext): Promise<CreditQuotaPurchase | null> {
    const row = await this.getRepo(tx).findOne({ where: { quotaId } });
    return row ? this.toDomain(row) : null;
  }

  async create(link: CreditQuotaPurchase, tx?: TransactionContext): Promise<CreditQuotaPurchase> {
    const repo = this.getRepo(tx);
    const row = repo.create({
      quotaId: link.quotaId,
      poId: link.poId,
    });
    const saved = await repo.save(row);
    return this.toDomain(saved);
  }
}
