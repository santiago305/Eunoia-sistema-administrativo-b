# Configuración De Exportaciones (XLSX)

Este documento explica dónde cambiar los nombres de columnas (labels), el formato de fecha y el alcance por módulo.

## Formato de fecha global
- Archivo: `Backend/src/shared/application/services/xlsx-builder.service.ts`
- Función: `formatLocalDateTime`
- Formato actual: `DD/MM/YYYY HH:mm`

Si quieres cambiar el formato para **todos** los excels, hazlo ahí.

## Compras
- Archivo: `Backend/src/modules/purchases/application/usecases/purchase-order/export-excel.usecase.ts`
- Configuración de columnas: constante `EXPORT_COLUMNS`

Cada columna tiene:
- `key`: identificador interno
- `label`: nombre mostrado al usuario en el popover y en el encabezado del Excel

Columnas SKU agregadas:
- `skuCodes`
- `skuNames`
- `skuQuantities`
- `skuItems`

Para renombrar columnas de compras, cambia solo `label` en `EXPORT_COLUMNS`.

## Producción
- Archivo: `Backend/src/modules/production/application/usecases/production-order/export-excel.usecase.ts`
- Configuración de columnas: constante `AVAILABLE_COLUMNS`

Para renombrar columnas de producción, cambia `label` en `AVAILABLE_COLUMNS`.

## Movimientos, Transferencias/Ajustes, Inventario
- Archivo: `Backend/src/modules/product-catalog/adapters/in/http/controllers/stock.controller.ts`

Mapeos de labels:
- `INVENTORY_LEDGER_EXPORT_LABELS` (movimientos)
- `INVENTORY_DOCUMENTS_EXPORT_LABELS` (transferencias y ajustes)
- `INVENTORY_EXPORT_LABELS` (inventario/stock)

Estos mapas traducen keys técnicas a nombres de negocio en:
- `GET .../export-columns`
- export con columnas por defecto cuando no se envía selección.

Si una key no está en el mapa, usa el nombre técnico (`key`) como fallback.

## Presets de exportación (backend)
Se guardan por usuario y tabla en `listing_search_metrics` usando `tableKey` específico por módulo.

Ejemplos:
- Compras: `purchase-orders:export`
- Producción: `production-orders:export`
- Movimientos: `inventory-ledger:export:{productType|ALL}`
- Transferencias/Ajustes: `inventory-documents:export:{docType}:{productType|ALL}`
- Inventario: `inventory:export:{productType|ALL}`

## Frontend: componente compartido
- Componente genérico: `Frontend/src/shared/components/components/ExportPopover.tsx`

Este componente recibe `columns` (con `key`/`label`) desde backend, por eso para cambiar texto de columnas conviene hacerlo en backend.

