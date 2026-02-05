# Controllers

Controladores HTTP para sesiones.

## Archivos

- `sessions.controller.ts`: listar sesiones activas y revocar sesiones.

## APIs disponibles

Base: `/api/sessions`

- `GET /api/sessions` (auth: `JWT`)
- `DELETE /api/sessions/:id` (auth: `JWT` + CSRF)
- `DELETE /api/sessions` (auth: `JWT` + CSRF)

## Notas

- El campo `isCurrent` indica si la sesion corresponde al access token actual.
- La revocacion no elimina filas, marca `revoked_at`.
