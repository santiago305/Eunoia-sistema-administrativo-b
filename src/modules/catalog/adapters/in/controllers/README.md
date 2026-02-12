# Controllers

Controladores HTTP para productos y variantes.

## Archivos

- `product.controller.ts`: endpoints de productos (crear, actualizar, activar/desactivar, listar, variantes).
- `product-variant.controller.ts`: endpoints de variantes (crear, actualizar, activar/desactivar, listar, consultar).

## APIs disponibles

Base productos: `/api/catalog/products`

- `POST /api/catalog/products`
- `PATCH /api/catalog/products/:id`
- `PATCH /api/catalog/products/:id/active`
- `GET /api/catalog/products`
- `GET /api/catalog/products/:id/variants`
- `GET /api/catalog/products/:id/with-variants`

Base variantes: `/api/catalog/variants`

- `POST /api/catalog/variants`
- `PATCH /api/catalog/variants/:id`
- `PATCH /api/catalog/variants/:id/active`
- `GET /api/catalog/variants/:id`
- `GET /api/catalog/variants`
