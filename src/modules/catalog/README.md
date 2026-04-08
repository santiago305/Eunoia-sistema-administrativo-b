# Catalog Module

Modulo de catalogo de productos y variantes.

## Estructura

- `adapters/`: entrada/salida (HTTP, DTOs, persistencia).
- `application/`: casos de uso y DTOs.
- `domain/`: entidades, errores, value objects y puertos.
- `infrastructure/`: modulo Nest del catalogo.

## Integracion Frontend

### Catalogo

- `GET /catalog/products`
  Uso: maestro de productos padre.
  Devuelve: solo productos base.

- `GET /catalog/variants`
  Uso: administracion de variantes.
  Devuelve: solo variantes.

- `GET /catalog/products/flat`
  Uso: catalogo comercial unificado.
  Devuelve: productos padre y variantes en una sola lista.

Campos relevantes de `flat`:

- `sourceType`: `PRODUCT` o `VARIANT`.
- `familyProductId`: id de la familia comercial.
- `parentProductId`: id del padre cuando el item es variante.
- `isGroupRoot`: `true` si el item es el padre del grupo.
- `isOperationalItem`: `true` cuando el item debe tratarse como vendible/fabricable.
- `displayName`: nombre listo para renderizar en UI.
- `hasVariants`: indica si la familia tiene variantes visibles en la pagina actual.
- `variantsCount`: cantidad de variantes visibles de la familia en la pagina actual.

Regla recomendada para frontend:

- catalogo/listados comerciales: usar `/catalog/products/flat`
- mantenimiento de padres: usar `/catalog/products`
- mantenimiento de variantes: usar `/catalog/variants`
- detalle de una familia: usar `/catalog/products/:id/with-variants`

### Recetas

Las recetas ya no dependen solo de variante terminada. Ahora dependen de un item terminado operativo:

- `finishedType`: `PRODUCT` o `VARIANT`
- `finishedItemId`: id del producto o de la variante segun `finishedType`

Endpoints:

- `POST /catalog/product-recipes`
- `GET /catalog/product-recipes?finishedType=...&finishedItemId=...`

Payload recomendado para crear receta:

```json
{
  "finishedType": "PRODUCT",
  "finishedItemId": "uuid-del-producto-o-variante",
  "primaVariantId": "uuid-de-la-materia-prima",
  "quantity": 1.25,
  "waste": 0
}
```

Notas:

- la materia prima sigue modelada por `primaVariantId`
- no existe fallback automatico entre receta de producto y receta de variante
- si se fabrica un `PRODUCT`, se busca receta de `PRODUCT`
- si se fabrica una `VARIANT`, se busca receta de `VARIANT`

### Publicacion por canal

Existe una base minima para catalogo publicado por canal:

- `POST /catalog/channels/items`
- `GET /catalog/channels/:channelCode/items`
- `PATCH /catalog/channels/items/:id`

Uso:

- storefronts
- catalogos por tienda/canal
- visibilidad comercial desacoplada del catalogo maestro

La respuesta se basa en el modelo `flat` y agrega:

- `publicationId`
- `channelCode`
- `isVisible`
- `sortOrder`
- `priceOverride`

Payload de creacion:

```json
{
  "channelCode": "tienda-web",
  "sourceType": "PRODUCT",
  "itemId": "uuid-del-producto-o-variante",
  "isVisible": true,
  "sortOrder": 1,
  "priceOverride": 29.9,
  "displayNameOverride": "Nombre comercial opcional"
}
```

Payload de actualizacion:

```json
{
  "isVisible": true,
  "sortOrder": 2,
  "priceOverride": 31.5,
  "displayNameOverride": "Nombre actualizado"
}
```

Regla:

- el catalogo maestro define productos y variantes
- la publicacion por canal define que items se muestran en cada canal

