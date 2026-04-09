# Suppliers Module

Modulo de proveedores.

## Estado actual

El camino activo para integraciones y abastecimiento debe usar `Sku`.

### Endpoints activos

- `POST /suppliers/skus`
- `GET /suppliers/skus/all`
- `GET /suppliers/skus/:supplierId/:skuId`
- `PATCH /suppliers/skus/:supplierId/:skuId`

## Regla de dominio

- Proveedor + `Sku` es la relacion operativa nueva para abastecimiento.
