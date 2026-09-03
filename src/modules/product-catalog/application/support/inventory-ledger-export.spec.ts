import { Direction } from "src/shared/domain/value-objects/direction";
import {
  buildInventoryLedgerExportRows,
  INVENTORY_LEDGER_EXPORT_COLUMNS,
} from "./inventory-ledger-export";

describe("inventory ledger export", () => {
  it("exposes only the requested movement columns in their expected order", () => {
    expect(INVENTORY_LEDGER_EXPORT_COLUMNS).toEqual([
      { key: "createdAt", label: "Fecha" },
      { key: "effectiveDate", label: "Fecha estimada" },
      { key: "skuCode", label: "SKU" },
      { key: "skuName", label: "Nombre SKU (detalles)" },
      { key: "quantity", label: "Cantidad" },
      { key: "warehouseName", label: "Almacén" },
      { key: "direction", label: "Entrada/Salida" },
    ]);
  });

  it("flattens SKU details and translates movement direction to Spanish", () => {
    const [entry, exit] = buildInventoryLedgerExportRows([
      {
        createdAt: new Date("2026-08-10T15:30:00.000Z"),
        effectiveDate: "2026-08-12",
        quantity: 5,
        direction: Direction.IN,
        warehouseName: "Principal",
        sku: {
          backendSku: "SKU-0001",
          customSku: "ARC-01",
          name: "Arcilla",
          attributes: [
            { code: "color", value: "Roja" },
            { code: "presentation", value: "Bolsa 25 kg" },
            { code: "variant", value: "Fina" },
          ],
        },
      },
      {
        direction: Direction.OUT,
        sku: { backendSku: "SKU-0002", name: "Esmalte" },
      },
    ]);

    expect(entry).toEqual({
      createdAt: new Date("2026-08-10T15:30:00.000Z"),
      effectiveDate: "12/08/2026",
      skuCode: "ARC-01",
      skuName: "Arcilla Bolsa 25 kg Fina Roja",
      quantity: 5,
      warehouseName: "Principal",
      direction: "Entrada",
    });
    expect(exit).toMatchObject({
      skuCode: "SKU-0002",
      skuName: "Esmalte",
      direction: "Salida",
    });
  });
});
