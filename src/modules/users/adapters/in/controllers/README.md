# Controllers

Controladores HTTP para operaciones del usuario.

## Archivos

- `users.controller.ts`: expone endpoints de creacion, listado, consulta, actualizacion, borrado/restauracion, cambio de password y gestion de avatar; aplica `JwtAuthGuard` y `RolesGuard` segun el caso.

## APIs disponibles

Base: `/api/users`

- `POST /api/users/create` (roles: `ADMIN`, `MODERATOR`)
- `GET /api/users/findAll` (roles: `ADMIN`, `MODERATOR`, retorna todos los usuarios)
- `GET /api/users/actives` (roles: `ADMIN`, `MODERATOR`, retorna solo usuarios activos)
- `GET /api/users/desactive` (roles: `ADMIN`, `MODERATOR`, retorna solo usuarios desactivados)
- `GET /api/users/me` (auth: `JWT`)
- `GET /api/users/search/:id` (roles: `ADMIN`, `MODERATOR`)
- `GET /api/users/email/:email` (roles: `ADMIN`, `MODERATOR`)
- `PATCH /api/users/update/:id` (auth: `JWT`, solo dueno)
- `PATCH /api/users/delete/:id` (roles: `ADMIN`, `MODERATOR`)
- `PATCH /api/users/restore/:id` (roles: `ADMIN`)
- `PATCH /api/users/change-password/:id` (auth: `JWT`, solo dueno)
- `POST /api/users/me/avatar` (auth: `JWT`, usa el usuario del token)
- `DELETE /api/users/me/avatar` (auth: `JWT`, usa el usuario del token)

## Notas de avatar

- El upload de avatar usa `multipart/form-data` con campo `avatar`.
- El backend procesa la imagen y la convierte a `webp` antes de persistirla.
- Si falla la actualizacion en base de datos despues de guardar el archivo, se intenta limpiar el archivo para evitar huerfanos.
- El avatar no se modifica por `PATCH /api/users/update/:id`; debe usarse el endpoint dedicado.
