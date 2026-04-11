# Product Catalog Module

Modulo nuevo de catalogo operativo basado en `Product + Sku`.

## Reglas de dominio

- `Product`: familia comercial. No tiene stock ni receta.
- `Sku`: item operativo real. Tiene precio, costo, atributos, stock, receta y movimientos.
- `Recipe`: cuelga de `Sku`.
- `StockItem`: representa el item inventariable de un `Sku`.
- `CatalogPublication`: publica `Sku` por canal.

## Endpoints principales

### Productos

- `GET /products`
- `POST /products`
- `GET /products/:id`
- `PATCH /products/:id`

### Skus

- `GET /products/:id/skus`
- `POST /products/:id/skus`
- `GET /skus`
- `GET /skus/:id`
- `PATCH /skus/:id`

### Recetas

- `GET /skus/:id/recipe`
- `POST /skus/:id/recipe`

### Publicaciones por canal

- `GET /channels/:channelCode/skus`
- `POST /channels/skus`
- `PATCH /channels/skus/:id`

### Stock e inventario

- `POST /skus/:id/stock-item`
- `GET /skus/:id/stock-item`
- `GET /stock-items/:id`
- `GET /skus/:id/stock`
- `POST /stock-items/:id/balances`
- `POST /stock-items/:id/movements`
- `GET /stock-items/:id/ledger`

### Units

- `GET /units`
- `GET /units/:id`
- `GET /units/code/:code`

## Seeders

- `product-catalog.seeder.ts`
- `product-catalog-recipe.seeder.ts`

Estos seeders reemplazan el caso antiguo de padres vendibles + variantes vendibles por familias `Product` y items operativos `Sku`.
