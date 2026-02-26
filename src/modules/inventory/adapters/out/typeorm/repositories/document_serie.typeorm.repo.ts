import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import DocumentSerie from '../../../../domain/entities/document-serie';
import { DocType } from '../../../../domain/value-objects/doc-type';
import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import { DocumentSeriesRepository } from '../../../../domain/ports/document-series.repository.port';

import { DocumentSerie as OrmSerie } from '../entities/document_serie.entity';
import { TypeormTransactionContext } from 'src/shared/infrastructure/typeorm/typeorm.transaction-context';

@Injectable()
export class DocumentSeriesTypeormRepository implements DocumentSeriesRepository {
  constructor(
    @InjectRepository(OrmSerie)
    private readonly repo: Repository<OrmSerie>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getSerieRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(OrmSerie);
  }

  private toDomain(row: OrmSerie): DocumentSerie {
    return new DocumentSerie(
      row.id,
      row.code,
      row.name,
      row.docType,
      row.warehouseId,
      row.nextNumber,
      row.padding,
      row.separator,
      row.isActive,
      row.createdAt,
    );
  }

  async creatDocumentSerie(
    documentSerie: DocumentSerie,
    tx?: TransactionContext,
  ): Promise<DocumentSerie> {
    const repo = this.getSerieRepo(tx);

    const row = repo.create({
      id: documentSerie.id,
      code: documentSerie.code,
      name: documentSerie.name,
      docType: documentSerie.docType,
      warehouseId: documentSerie.warehouseId,
      nextNumber: documentSerie.nextNumber,
      padding: documentSerie.padding,
      separator: documentSerie.separator,
      isActive: documentSerie.isActive,
      createdAt: documentSerie.createdAt,
    });

    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  async findActiveFor(
    params: { docType?: DocType; isActive?: boolean; warehouseId: string },
    tx?: TransactionContext,
  ): Promise<DocumentSerie[]> {
    const repo = this.getSerieRepo(tx);
    const qb = repo.createQueryBuilder('s');

    if (params.docType) {
      qb.andWhere('s.docType = :docType', { docType: params.docType });
    }
    if (params.warehouseId) {
      qb.andWhere('s.warehouseId = :warehouseId', { warehouseId: params.warehouseId });
    }
    if (params.isActive !== undefined) {
      qb.andWhere('s.isActive = :isActive', { isActive: params.isActive });
    }

    const rows = await qb
      .orderBy('s.createdAt', 'DESC')
      .getMany();

    return rows.map((r) => this.toDomain(r));
  }

  async findById(serieId: string, tx?: TransactionContext): Promise<DocumentSerie | null> {
    const row = await this.getSerieRepo(tx).findOne({
      where: { id: serieId },
    });

    return row ? this.toDomain(row) : null;
  }

  async setActive(id: string, isActive: boolean, tx?: TransactionContext): Promise<void> {
    const repo = this.getSerieRepo(tx);
    await repo.update({ id }, { isActive });
  }

  async reserveNextNumber(serieId: string, tx: TransactionContext): Promise<number> {
    const manager = (tx as any).manager as EntityManager;
    const serieRepo = manager.getRepository(OrmSerie);

    const row = await serieRepo.findOne({
      where: { id: serieId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!row || !row.isActive) {
      throw new Error('Serie no encontrada o inactiva');
    }

    const reserved = row.nextNumber;
    row.nextNumber = row.nextNumber + 1;
    await serieRepo.save(row);

    return reserved;
  }
}
