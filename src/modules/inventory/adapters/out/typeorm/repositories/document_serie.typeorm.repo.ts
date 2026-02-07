import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import DocumentSerie from '../../../../domain/entities/document-serie';
import { DocType } from '../../../../domain/value-objects/doc-type';
import { TransactionContext } from '../../../../domain/ports/unit-of-work.port'; // ✅ MISMO puerto
import { DocumentSeriesRepository } from '../../../../domain/ports/document-series.repository.port';

import { DocumentSerie as OrmSerie } from '../entities/document_serie.entity';
import { TypeormTransactionContext } from '../uow/typeorm.transaction-context';

@Injectable()
export class DocumentSeriesTypeormRepository implements DocumentSeriesRepository {
  constructor(
    @InjectRepository(OrmSerie)
    private readonly repo: Repository<OrmSerie>,
  ) {}

   private manager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
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
    const repo = this.manager(tx).getRepository(OrmSerie);

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
    params: { docType: DocType; warehouseId: string },
    tx?: TransactionContext,
  ): Promise<DocumentSerie | null> {
    const row = await this.manager(tx).getRepository(OrmSerie).findOne({
      where: {
        docType: params.docType,
        warehouseId: params.warehouseId,
        isActive: true,
      },
    });

    return row ? this.toDomain(row) : null; 
  }

  async findById(serieId: string, tx?: TransactionContext): Promise<DocumentSerie | null> {
    const row = await this.manager(tx).getRepository(OrmSerie).findOne({
      where: { id: serieId },
    });

    return row ? this.toDomain(row) : null; 
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
