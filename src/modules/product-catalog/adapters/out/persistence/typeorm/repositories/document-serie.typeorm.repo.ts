import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { TypeormTransactionContext } from "src/shared/infrastructure/typeorm/typeorm.transaction-context";
import { ProductCatalogDocumentSerie } from "src/modules/product-catalog/domain/entities/document-serie";
import { ProductCatalogDocumentSerieRepository } from "src/modules/product-catalog/domain/ports/document-serie.repository";
import { ProductCatalogDocumentSerieEntity } from "../entities/document-serie.entity";

@Injectable()
export class ProductCatalogDocumentSerieTypeormRepository implements ProductCatalogDocumentSerieRepository {
  constructor(
    @InjectRepository(ProductCatalogDocumentSerieEntity)
    private readonly repo: Repository<ProductCatalogDocumentSerieEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getSerieRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(ProductCatalogDocumentSerieEntity);
  }

  private toDomain(row: ProductCatalogDocumentSerieEntity): ProductCatalogDocumentSerie {
    return ProductCatalogDocumentSerie.create({
      id: row.id,
      code: row.code,
      name: row.name,
      docType: row.docType,
      warehouseId: row.warehouseId,
      nextNumber: row.nextNumber,
      padding: row.padding,
      separator: row.separator,
      isActive: row.isActive,
      createdAt: row.createdAt,
    });
  }

  async create(documentSerie: ProductCatalogDocumentSerie, tx?: TransactionContext): Promise<ProductCatalogDocumentSerie> {
    const row = this.getSerieRepo(tx).create({
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

    return this.toDomain(await this.getSerieRepo(tx).save(row));
  }

  async findActiveFor(params: { docType?: DocType; isActive?: boolean; warehouseId: string }, tx?: TransactionContext): Promise<ProductCatalogDocumentSerie[]> {
    const qb = this.getSerieRepo(tx).createQueryBuilder("s");
    if (params.docType) qb.andWhere("s.docType = :docType", { docType: params.docType });
    if (params.warehouseId) qb.andWhere("s.warehouseId = :warehouseId", { warehouseId: params.warehouseId });
    if (params.isActive !== undefined) qb.andWhere("s.isActive = :isActive", { isActive: params.isActive });
    const rows = await qb.orderBy("s.createdAt", "DESC").getMany();
    return rows.map((r) => this.toDomain(r));
  }

  async reserveNextNumber(serieId: string, tx: TransactionContext): Promise<number> {
    const manager = (tx as TypeormTransactionContext).manager;
    const row = await manager.getRepository(ProductCatalogDocumentSerieEntity).findOne({
      where: { id: serieId },
      lock: { mode: "pessimistic_write" },
    });
    if (!row || !row.isActive) throw new Error("Serie no encontrada o inactiva");
    const reserved = row.nextNumber;
    row.nextNumber += 1;
    await manager.getRepository(ProductCatalogDocumentSerieEntity).save(row);
    return reserved;
  }

  async findById(serieId: string, tx?: TransactionContext): Promise<ProductCatalogDocumentSerie | null> {
    const row = await this.getSerieRepo(tx).findOne({ where: { id: serieId } });
    return row ? this.toDomain(row) : null;
  }

  async setActive(id: string, isActive: boolean, tx?: TransactionContext): Promise<void> {
    await this.getSerieRepo(tx).update({ id }, { isActive });
  }
}
