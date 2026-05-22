import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TelephoneRepository } from "src/modules/clients/domain/ports/telephone.repository";
import { Telephone } from "src/modules/clients/domain/entities/telephone";
import { ClientFactory } from "src/modules/clients/domain/factories/client.factory";
import { ClientId } from "src/modules/clients/domain/value-objects/client-id.vo";
import { TelephoneId } from "src/modules/clients/domain/value-objects/telephone-id.vo";
import { TelephoneEntity } from "../entities/telephone.entity";

@Injectable()
export class TelephoneTypeormRepository implements TelephoneRepository {
  constructor(
    @InjectRepository(TelephoneEntity)
    private readonly repo: Repository<TelephoneEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(TelephoneEntity);
  }

  private toDomain(row: TelephoneEntity): Telephone {
    return ClientFactory.createTelephone({
      telephoneId: new TelephoneId(row.id),
      clientId: new ClientId(row.clientId),
      number: row.number,
      isMain: row.isMain,
    });
  }

  async findById(telephoneId: string, tx?: TransactionContext): Promise<Telephone | null> {
    const row = await this.getRepo(tx).findOne({ where: { id: telephoneId } });
    return row ? this.toDomain(row) : null;
  }
  async deleteByClientId(clientId: string, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).delete({ clientId });
  }

  async listByClientId(clientId: string, tx?: TransactionContext): Promise<Telephone[]> {
    const rows = await this.getRepo(tx).find({
      where: { clientId },
      order: { isMain: "DESC", number: "ASC" },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async create(telephone: Telephone, tx?: TransactionContext): Promise<Telephone> {
    const repo = this.getRepo(tx);
    const row = repo.create({
      id: telephone.telephoneId.value,
      clientId: telephone.clientId.value,
      number: telephone.number,
      isMain: telephone.isMain ?? false,
    });
    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  async update(
    params: {
      telephoneId: string;
      number?: string;
      isMain?: boolean;
    },
    tx?: TransactionContext,
  ): Promise<Telephone | null> {
    const repo = this.getRepo(tx);
    const patch: Partial<TelephoneEntity> = {};

    if (params.number !== undefined) patch.number = params.number;
    if (params.isMain !== undefined) patch.isMain = params.isMain;

    await repo.update({ id: params.telephoneId }, patch);
    const updated = await repo.findOne({ where: { id: params.telephoneId } });
    return updated ? this.toDomain(updated) : null;
  }

  async unsetMainByClientId(clientId: string, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ clientId, isMain: true }, { isMain: false });
  }

  async setMain(telephoneId: string, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ id: telephoneId }, { isMain: true });
  }
}
