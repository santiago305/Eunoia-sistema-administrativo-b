import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { EntityManager, Repository } from "typeorm";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/infrastructure/typeorm/typeorm.transaction-context";
import { LedgerRepository } from "src/modules/product-catalog/integration/inventory/ports/ledger.repository.port";
import { LedgerEntry } from "src/modules/product-catalog/integration/inventory/entities/ledger-entry";
import { ProductCatalogInventoryLedgerEntity } from "../persistence/typeorm/entities/inventory-ledger.entity";

@Injectable()
export class InventoryLedgerBridge implements LedgerRepository {
  constructor(
    @InjectRepository(ProductCatalogInventoryLedgerEntity)
    private readonly repo: Repository<ProductCatalogInventoryLedgerEntity>,
  ) {}

  private ledgerRepo(tx?: TransactionContext) {
    const manager = tx && (tx as TypeormTransactionContext).manager ? (tx as TypeormTransactionContext).manager : this.repo.manager;
    return manager.getRepository(ProductCatalogInventoryLedgerEntity);
  }

  async append(entries: LedgerEntry[], tx?: TransactionContext): Promise<void> {
    await this.ledgerRepo(tx).save(entries.map((e) => ({
      docId: e.docId,
      docItemId: e.docItemId ?? null,
      warehouseId: e.warehouseId,
      stockItemId: e.stockItemId,
      direction: e.direction,
      quantity: e.quantity,
      locationId: e.locationId ?? null,
      wasteQty: e.wasteQty ?? 0,
      unitCost: e.unitCost ?? null,
    })));
  }

  async updateWasteByDocItem(params: { docItemId: string; wasteQty: number }, tx?: TransactionContext): Promise<boolean> {
    const result = await this.ledgerRepo(tx).update({ docItemId: params.docItemId }, { wasteQty: params.wasteQty });
    return (result.affected ?? 0) > 0;
  }

  async getBalances(): Promise<{ entradaRango: number; salidaRango: number; balanceRango: number; balanceInicial: number; balanceFinal: number; balanceTotal: number; }> {
    throw new Error("Legacy ledger balances no soportado en ProductCatalog bridge");
  }
  async getDailyTotals(): Promise<{ day: string; entrada: number; salida: number; balance: number; }[]> {
    throw new Error("Legacy ledger daily totals no soportado en ProductCatalog bridge");
  }
  async list(): Promise<{ items: LedgerEntry[]; total: number; page: number; limit: number; }> {
    throw new Error("Legacy ledger list no soportado en ProductCatalog bridge");
  }
}


