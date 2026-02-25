# Controllers

Controladores HTTP para gestion de roles.

## Archivos

- `roles.controller.ts`: endpoints de creacion, listado, consulta, actualizacion, borrado y restauracion de roles.

## APIs disponibles

Base: `/api/roles`

- `POST /api/roles/create` (roles: `ADMIN`)
- `GET /api/roles` (roles: `ADMIN`, acepta `?status=all|active|inactive`)
- `GET /api/roles/:id` (roles: `ADMIN`)
- `PATCH /api/roles/:id` (roles: `ADMIN`)
- `DELETE /api/roles/:id` (roles: `ADMIN`)
- `PATCH /api/roles/:id/restore` (roles: `ADMIN`)

## Comportamiento de listados

- `GET /api/roles`: devuelve todos los roles por defecto y acepta `?status=all|active|inactive`.
- `GET /api/roles?status=active`: devuelve solo roles activos.
- `GET /api/roles?status=inactive`: devuelve solo roles inactivos.

Internamente el modulo usa un filtro `status` (`all | active | inactive`) en el
puerto de lectura para soportar futuras variantes de listado sin duplicar logica.

## Validacion

Si `status` tiene un valor distinto de `all`, `active` o `inactive`, el controlador
responde `400 Bad Request`.
