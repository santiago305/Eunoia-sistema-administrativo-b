# Controllers

Controladores HTTP para operaciones del usuario.

## Archivos

- `users.controller.ts`: expone endpoints de creacion, listado, consulta, actualizacion, borrado/restauracion, cambio de password y subida de avatar; aplica `JwtAuthGuard` y `RolesGuard` segun el caso.

## APIs disponibles

Base: `/api/users`

- `POST /api/users/create` (roles: `ADMIN`, `MODERATOR`)
- `GET /api/users/findAll` (roles: `ADMIN`, `MODERATOR`)
- `GET /api/users/actives` (roles: `ADMIN`, `MODERATOR`)
- `GET /api/users/me` (auth: `JWT`)
- `GET /api/users/search/:id` (roles: `ADMIN`, `MODERATOR`)
- `GET /api/users/email/:email` (roles: `ADMIN`, `MODERATOR`)
- `PATCH /api/users/update/:id` (auth: `JWT`, solo dueño)
- `PATCH /api/users/delete/:id` (roles: `ADMIN`, `MODERATOR`)
- `PATCH /api/users/restore/:id` (roles: `ADMIN`)
- `PATCH /api/users/change-password/:id` (auth: `JWT`, solo dueño)
- `POST /api/users/:id/avatar` (auth: `JWT`, solo dueño)
