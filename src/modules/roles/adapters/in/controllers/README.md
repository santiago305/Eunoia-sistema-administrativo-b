# Controllers

Controladores HTTP para gestion de roles.

## Archivos

- `roles.controller.ts`: endpoints de creacion, listado, consulta, actualizacion, borrado y restauracion de roles.

## APIs disponibles

Base: `/roles`

- `POST /roles/create` (roles: `ADMIN`)
- `GET /roles` (roles: `ADMIN`)
- `GET /roles/actives` (roles: `ADMIN`)
- `GET /roles/:id` (roles: `ADMIN`)
- `PATCH /roles/:id` (roles: `ADMIN`)
- `DELETE /roles/:id` (roles: `ADMIN`)
- `PATCH /roles/:id/restore` (roles: `ADMIN`)
