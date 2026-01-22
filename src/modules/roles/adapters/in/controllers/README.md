# Controllers

Controladores HTTP para gestion de roles.

## Archivos

- `roles.controller.ts`: endpoints de creacion, listado, consulta, actualizacion, borrado y restauracion de roles.

## APIs disponibles

Base: `/api/roles`

- `POST /api/roles/create` (roles: `ADMIN`)
- `GET /api/roles` (roles: `ADMIN`)
- `GET /api/roles/actives` (roles: `ADMIN`)
- `GET /api/roles/:id` (roles: `ADMIN`)
- `PATCH /api/roles/:id` (roles: `ADMIN`)
- `DELETE /api/roles/:id` (roles: `ADMIN`)
- `PATCH /api/roles/:id/restore` (roles: `ADMIN`)
