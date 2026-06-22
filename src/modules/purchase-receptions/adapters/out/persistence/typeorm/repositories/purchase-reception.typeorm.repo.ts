import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { PurchaseReception } from "src/modules/purchase-receptions/domain/entity/purchase-reception";
import { PurchaseReceptionItem } from "src/modules/purchase-receptions/domain/entity/purchase-reception-item";
import {
  PurchaseReceptionRepository,
  PurchaseReceptionTotals,
  PurchaseReceptionWithItems,
} from "src/modules/purchase-receptions/domain/ports/purchase-reception.repository";
import { PurchaseReceptionEntity } from "../entities/purchase-reception.entity";
import { PurchaseReceptionItemEntity } from "../entities/purchase-reception-item.entity";
import { PurchaseReceptionMapper } from "../mappers/purchase-reception.mapper";

@Injectable()
export class PurchaseReceptionTypeormRepository implements PurchaseReceptionRepository {
  constructor(
    @InjectRepository(PurchaseReceptionEntity)
    private readonly receptionRepo: Repository<PurchaseReceptionEntity>,
    @InjectRepository(PurchaseReceptionItemEntity)
    private readonly itemRepo: Repository<PurchaseReceptionItemEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.receptionRepo.manager;
  }

  private receptions(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(PurchaseReceptionEntity);
  }

  private items(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(PurchaseReceptionItemEntity);
  }

  async create(
    reception: PurchaseReception,
    items: PurchaseReceptionItem[],
    tx?: TransactionContext,
  ): Promise<PurchaseReceptionWithItems> {
    const receptionRepo = this.receptions(tx);
    const itemRepo = this.items(tx);
    const savedReception = await receptionRepo.save(
      receptionRepo.create(PurchaseReceptionMapper.toPersistence(reception)),
    );
    const savedItems = await itemRepo.save(
      items.map((item) =>
        itemRepo.create(
          PurchaseReceptionMapper.toItemPersistence(
            new PurchaseReceptionItem(
              item.receptionItemId,
              savedReception.id,
              item.purchaseItemId,
              item.stockItemId,
              item.itemType,
              item.orderedQuantity,
              item.receivedQuantity,
              item.acceptedQuantity,
              item.rejectedQuantity,
              item.affectsStock,
              item.stockPosted,
              item.serviceConfirmed,
              item.note,
            ),
          ),
        ),
      ),
    );

    return {
      reception: PurchaseReceptionMapper.toDomain(savedReception),
      items: savedItems.map(PurchaseReceptionMapper.toItemDomain),
    };
  }

  async findById(receptionId: string, tx?: TransactionContext): Promise<PurchaseReceptionWithItems | null> {
    const reception = await this.receptions(tx).findOne({ where: { id: receptionId } });
    if (!reception) return null;
    const items = await this.items(tx).find({ where: { receptionId }, order: { id: "ASC" } });
    return {
      reception: PurchaseReceptionMapper.toDomain(reception),
      items: items.map(PurchaseReceptionMapper.toItemDomain),
    };
  }

  async listByPurchaseId(purchaseId: string, tx?: TransactionContext): Promise<PurchaseReceptionWithItems[]> {
    const receptions = await this.receptions(tx).find({
      where: { purchaseId },
      order: { createdAt: "DESC" },
    });
    const receptionIds = receptions.map((row) => row.id);
    const items = receptionIds.length
      ? await this.items(tx)
          .createQueryBuilder("item")
          .where("item.purchase_reception_id IN (:...receptionIds)", { receptionIds })
          .orderBy("item.purchase_reception_id", "ASC")
          .addOrderBy("item.purchase_reception_item_id", "ASC")
          .getMany()
      : [];
    const grouped = new Map<string, PurchaseReceptionItemEntity[]>();
    items.forEach((item) => {
      const bucket = grouped.get(item.receptionId) ?? [];
      bucket.push(item);
      grouped.set(item.receptionId, bucket);
    });

    return receptions.map((reception) => ({
      reception: PurchaseReceptionMapper.toDomain(reception),
      items: (grouped.get(reception.id) ?? []).map(PurchaseReceptionMapper.toItemDomain),
    }));
  }

  async listConfirmedTotalsByPurchaseId(
    purchaseId: string,
    tx?: TransactionContext,
  ): Promise<PurchaseReceptionTotals[]> {
    const rows = await this.items(tx)
      .createQueryBuilder("item")
      .innerJoin(PurchaseReceptionEntity, "reception", `"reception"."purchase_reception_id" = "item"."purchase_reception_id"`)
      .select(`"item"."purchase_item_id"`, "purchaseItemId")
      .addSelect(`COALESCE(SUM("item"."received_quantity"), 0)`, "receivedQuantity")
      .addSelect(`COALESCE(SUM("item"."accepted_quantity"), 0)`, "acceptedQuantity")
      .addSelect(`COALESCE(SUM("item"."rejected_quantity"), 0)`, "rejectedQuantity")
      .where(`"reception"."purchase_id" = :purchaseId`, { purchaseId })
      .andWhere(`"reception"."status" = :status`, { status: "CONFIRMED" })
      .groupBy(`"item"."purchase_item_id"`)
      .getRawMany<PurchaseReceptionTotals>();

    return rows.map((row) => ({
      purchaseItemId: row.purchaseItemId,
      receivedQuantity: Number(row.receivedQuantity),
      acceptedQuantity: Number(row.acceptedQuantity),
      rejectedQuantity: Number(row.rejectedQuantity),
    }));
  }

  async confirm(
    receptionId: string,
    params: {
      receivedByUserId?: string;
      receivedAt: Date;
      inventoryDocumentId?: string;
      stockPostedItemIds?: string[];
      serviceConfirmedItemIds?: string[];
    },
    tx?: TransactionContext,
  ): Promise<void> {
    await this.receptions(tx).update(
      { id: receptionId },
      {
        status: "CONFIRMED",
        receivedByUserId: params.receivedByUserId,
        receivedAt: params.receivedAt,
        inventoryDocumentId: params.inventoryDocumentId,
      },
    );
    if (params.stockPostedItemIds?.length) {
      await this.items(tx)
        .createQueryBuilder()
        .update(PurchaseReceptionItemEntity)
        .set({ stockPosted: true })
        .where("purchase_reception_id = :receptionId", { receptionId })
        .andWhere("purchase_item_id IN (:...itemIds)", { itemIds: params.stockPostedItemIds })
        .execute();
    }
    if (params.serviceConfirmedItemIds?.length) {
      await this.items(tx)
        .createQueryBuilder()
        .update(PurchaseReceptionItemEntity)
        .set({ serviceConfirmed: true })
        .where("purchase_reception_id = :receptionId", { receptionId })
        .andWhere("purchase_item_id IN (:...itemIds)", { itemIds: params.serviceConfirmedItemIds })
        .execute();
    }
  }
}
