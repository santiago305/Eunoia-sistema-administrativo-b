import { Injectable } from "@nestjs/common";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";

@Injectable()
export class SaleOrderNumberingService {
  async reserveNext(tx: TransactionContext): Promise<{ serie: "PE"; correlative: number }> {
    const manager = (tx as TypeormTransactionContext).manager;
    await manager.query(`SELECT pg_advisory_xact_lock(hashtext('sale_orders_pe_correlative'))`);
    const rows = await manager.query(`
      SELECT correlative
      FROM sale_orders
      WHERE serie = 'PE' AND correlative IS NOT NULL
      ORDER BY correlative DESC, created_at DESC
      LIMIT 1
    `);

    return { serie: "PE", correlative: Number(rows?.[0]?.correlative ?? 0) + 1 };
  }
}
