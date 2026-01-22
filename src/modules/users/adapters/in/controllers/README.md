# Controllers

Controladores HTTP para operaciones del usuario.

## Archivos

- `users.controller.ts`: expone endpoints de creacion, listado, consulta, actualizacion, borrado/restauracion, cambio de password y subida de avatar; aplica `JwtAuthGuard` y `RolesGuard` segun el caso.

## APIs disponibles

Base: `/users`

- `POST /users/create` (roles: `ADMIN`, `MODERATOR`)
- `GET /users/findAll` (roles: `ADMIN`, `MODERATOR`)
- `GET /users/actives` (roles: `ADMIN`, `MODERATOR`)
- `GET /users/me` (auth: `JWT`)
- `GET /users/search/:id` (roles: `ADMIN`, `MODERATOR`)
- `GET /users/email/:email` (roles: `ADMIN`, `MODERATOR`)
- `PATCH /users/update/:id` (auth: `JWT`, solo dueño)
- `PATCH /users/delete/:id` (roles: `ADMIN`, `MODERATOR`)
- `PATCH /users/restore/:id` (roles: `ADMIN`)
- `PATCH /users/change-password/:id` (auth: `JWT`, solo dueño)
- `POST /users/:id/avatar` (auth: `JWT`, solo dueño)
