# Production Frontend Integration

## Regla principal

En produccion, `finishedItemId` debe entenderse como `stock_item_id`.

No debe enviarse directamente `productId` o `variantId` a los endpoints de ordenes de produccion cuando el contrato pide `finishedItemId`.

## Modelo operativo

Un `stock_item` terminado puede ser:

- `PRODUCT`
- `VARIANT`

La orden de produccion trabaja con ese `stock_item` y desde ahi el backend resuelve:

- el tipo operativo del terminado
- la receta correspondiente
- los movimientos posteriores

## Salidas utiles para frontend

En las respuestas de items/detalle de produccion ahora existen estos campos:

- `finishedItemType`: tipo operativo del terminado (`PRODUCT` o `VARIANT`)
- `finishedItem.type`: igual que arriba, en el detalle
- `finishedItem.productId`: id del producto padre o del producto terminado
- `finishedItem.variantId`: id de la variante si aplica

## Recomendacion de UI

- selectores de terminado: consumir items operativos, no solo productos padre
- si la UI viene desde catalogo comercial, preferir `/catalog/products/flat`
- al guardar en produccion, persistir `finishedItemId` como `stock_item_id`
- para mostrar nombres, usar metadata resuelta del detalle o `displayName` desde catalogo

## Riesgo a evitar

No mezclar estos ids en frontend:

- `stock_item_id`
- `product_id`
- `variant_id`

Si la pantalla trabaja con produccion, el id correcto para `finishedItemId` es el `stock_item_id`.
