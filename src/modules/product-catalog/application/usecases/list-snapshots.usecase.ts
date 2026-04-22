import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  PRODUCT_CATALOG_INVENTORY_REPOSITORY,
  ProductCatalogInventoryRepository,
} from "../../domain/ports/inventory.repository";
import {
  PRODUCT_CATALOG_INVENTORY_LEDGER_REPOSITORY,
  ProductCatalogInventoryLedgerRepository,
} from "../../domain/ports/inventory-ledger.repository";
import {
  PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY,
  ProductCatalogStockItemRepository,
} from "../../domain/ports/stock-item.repository";
import { errorResponse } from "src/shared/response-standard/response";
import { PRODUCT_CATALOG_SKU_REPOSITORY, ProductCatalogSkuRepository } from "../../domain/ports/sku.repository";
import { Direction } from "src/shared/domain/value-objects/direction";
import { DocType } from "src/shared/domain/value-objects/doc-type";

@Injectable()
export class ListProductCatalogInventorySnapshotsBySku {
  constructor(
    @Inject(PRODUCT_CATALOG_INVENTORY_REPOSITORY)
    private readonly repoInventory: ProductCatalogInventoryRepository,
    @Inject(PRODUCT_CATALOG_INVENTORY_LEDGER_REPOSITORY)
    private readonly ledgerRepo: ProductCatalogInventoryLedgerRepository,
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: ProductCatalogStockItemRepository,
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly skuRepo: ProductCatalogSkuRepository,
  ) {}

  private calcAvailable(onHand: number, reserved: number) {
    return Math.max(0, onHand - reserved);
  }

  async execute(params: { warehouseId?: string; skuId: string }) {
    const sku = await this.skuRepo.findById(params.skuId);
    if (!sku) {
      throw new NotFoundException(errorResponse("Sku no encontrado"));
    }

    const stockItem = await this.stockItemRepo.findBySkuId(params.skuId);
    if (!stockItem) {
      throw new BadRequestException(errorResponse("Stock item not found for SKU"));
    }

    const snapshots = await this.repoInventory.list({ warehouseId: params.warehouseId, stockItemId: stockItem.id });

    const stockTotalsBase = snapshots.reduce(
      (acc, s) => ({
        onHand: acc.onHand + (s.onHand ?? 0),
        reserved: acc.reserved + (s.reserved ?? 0),
        available: acc.available + (s.available ?? this.calcAvailable(s.onHand ?? 0, s.reserved ?? 0)),
      }),
      { onHand: 0, reserved: 0, available: 0 },
    );

    // Forecast basado en 4 semanas completas (calendario Lima/Perú, Dom-Sáb). Semana 5 (actual) solo progreso.
    const now = new Date();
    const timeZone = "America/Lima";
    const msPerDay = 24 * 60 * 60 * 1000;
    const toExclusive = now;

    const getZonedParts = (date: Date, opts: Intl.DateTimeFormatOptions): Record<string, number> => {
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone, ...opts }).formatToParts(date);
      const out: Record<string, number> = {};
      for (const p of parts) {
        if (p.type === "literal") continue;
        const n = Number(p.value);
        if (!Number.isFinite(n)) continue;
        out[p.type] = n;
      }
      return out;
    };

    const getTimeZoneOffsetMs = (date: Date) => {
      const p = getZonedParts(date, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      });
      const asUtc = Date.UTC(p.year, (p.month ?? 1) - 1, p.day ?? 1, p.hour ?? 0, p.minute ?? 0, p.second ?? 0);
      return asUtc - date.getTime();
    };

    const zonedTimeToUtc = (
      ymd: { year: number; month: number; day: number },
      time?: { hour: number; minute: number; second: number },
    ) => {
      const t = time ?? { hour: 0, minute: 0, second: 0 };
      const utcGuess = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day, t.hour, t.minute, t.second));
      const offsetMs = getTimeZoneOffsetMs(utcGuess);
      return new Date(utcGuess.getTime() - offsetMs);
    };

    const addDaysYmd = (ymd: { year: number; month: number; day: number }, deltaDays: number) => {
      const d = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day + deltaDays));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
    };

    // Inicio de semana calendario (domingo 00:00) en hora Lima/Perú.
    const nowYmd = (() => {
      const p = getZonedParts(now, { year: "numeric", month: "2-digit", day: "2-digit" });
      return { year: p.year, month: p.month, day: p.day };
    })();

    const limaDow = new Date(Date.UTC(nowYmd.year, nowYmd.month - 1, nowYmd.day)).getUTCDay(); // 0=Dom..6=Sáb
    const daysSinceSunday = limaDow; // domingo=0
    const startOfThisWeekYmd = addDaysYmd(nowYmd, -daysSinceSunday);
    const startOfThisWeek = zonedTimeToUtc(startOfThisWeekYmd);

    const w1Start = zonedTimeToUtc(addDaysYmd(startOfThisWeekYmd, -28));
    const w2Start = zonedTimeToUtc(addDaysYmd(startOfThisWeekYmd, -21));
    const w3Start = zonedTimeToUtc(addDaysYmd(startOfThisWeekYmd, -14));
    const w4Start = zonedTimeToUtc(addDaysYmd(startOfThisWeekYmd, -7));
    const from = w1Start;

    const warehouseIdForLedger = params.warehouseId?.trim() ?? undefined; // Evitamos pasar string vacío a la consulta, para que no afecte los resultados (se interpreta como "sin filtro por warehouseId")

    const ledgerRows = await this.ledgerRepo.list({
      stockItemId: stockItem.id,
      warehouseId: warehouseIdForLedger,
      from,
      toExclusive,
    });

    const weekBounds = [w1Start, w2Start, w3Start, w4Start, startOfThisWeek, toExclusive] as const;

    // Semanas 1-4: completas (para el forecast). Semana 5: semana actual (progreso).
    const weeklyOut = [0, 0, 0, 0, 0];
    for (const row of ledgerRows) {
      if (row.docType !== DocType.OUT) continue;
      if (row.direction !== Direction.OUT) continue;
      const createdAt = row.createdAt;
      const qty = row.quantity ?? 0;

      for (let i = 0; i < 5; i += 1) {
        if (createdAt >= weekBounds[i] && createdAt < weekBounds[i + 1]) {
          weeklyOut[i] += qty;
          break;
        }
      }
    }

    const s1 = weeklyOut[0];
    const s2 = weeklyOut[1];
    const s3 = weeklyOut[2];
    const s4 = weeklyOut[3];
    const s5 = weeklyOut[4];

    // Proyección basada en tasa de crecimiento (CAGR) entre semana 1 y semana 4:
    // rate = (week4 / week1)^(1/3) - 1, y forecast = base * (1 + rate)
    // Base (más estable): promedio simple de las 4 semanas.
    const weightedWeekly = (s1 + s2 + s3 + s4) / 4;
    const growthIntervals = 3;
    const trendPctRaw = s1 > 0 ? Math.pow(s4 / s1, 1 / growthIntervals) - 1 : 0;
    const trendPct = Number.isFinite(trendPctRaw) ? trendPctRaw : 0;
    const forecastWeekly = Math.max(0, weightedWeekly * (1 + trendPct));
    const forecastDaily = forecastWeekly / 7;
    const stockAvailable = Math.max(0, stockTotalsBase.available);
    const daysOfStock = forecastDaily > 0 ? stockAvailable / forecastDaily : null;

    const currentWeekElapsedDays = Math.max(0, Math.min(7, (toExclusive.getTime() - startOfThisWeek.getTime()) / msPerDay));
    const currentWeekExpectedOutQtyToDate = forecastDaily * currentWeekElapsedDays;

    return {
      stockItemId: stockItem.id,
      sku,
      snapshots: snapshots.map((s) => ({
        warehouseId: s.warehouseId,
        locationId: s.locationId,
        onHand: s.onHand,
        reserved: s.reserved,
        available: s.available,
        updatedAt: s.updatedAt ?? null,
      })),
      forecast: {
        range: {
          from: from.toISOString(),
          toExclusive: toExclusive.toISOString(),
        },
        weeks: [
          { week: 1, from: weekBounds[0].toISOString(), toExclusive: weekBounds[1].toISOString(), outQty: s1 },
          { week: 2, from: weekBounds[1].toISOString(), toExclusive: weekBounds[2].toISOString(), outQty: s2 },
          { week: 3, from: weekBounds[2].toISOString(), toExclusive: weekBounds[3].toISOString(), outQty: s3 },
          { week: 4, from: weekBounds[3].toISOString(), toExclusive: weekBounds[4].toISOString(), outQty: s4 },
        ],
        currentWeek: {
          week: 5,
          from: weekBounds[4].toISOString(),
          toExclusive: weekBounds[5].toISOString(),
          outQty: s5,
          elapsedDays: currentWeekElapsedDays,
          expectedOutQtyToDate: currentWeekExpectedOutQtyToDate,
          deltaOutQtyToDate: s5 - currentWeekExpectedOutQtyToDate,
          pacePct: currentWeekExpectedOutQtyToDate > 0 ? s5 / currentWeekExpectedOutQtyToDate : null,
        },
        weightedWeekly,
        trendPct,
        forecastWeekly,
        forecastDaily,
        forecastWeeklyFromLastWeek: Math.max(0, s4 * (1 + trendPct)),
        stock: {
          onHand: stockTotalsBase.onHand,
          reserved: stockTotalsBase.reserved,
          available: stockAvailable,
        },
        daysOfStock,
        timeZone,
      },
    };
  }
}
