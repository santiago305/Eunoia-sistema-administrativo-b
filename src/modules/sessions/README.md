# Sessions Module

Modulo de sesiones. Registra sesiones activas por usuario y permite revocarlas.

## Responsabilidades

- Crear sesiones con refresh token hasheado.
- Listar sesiones activas por usuario.
- Revocar una sesion o todas (excepto la actual).

## Endpoints

Base: `/api/sessions`

- `GET /api/sessions` (auth: `JWT`)
- `DELETE /api/sessions/:id` (auth: `JWT` + CSRF)
- `DELETE /api/sessions` (auth: `JWT` + CSRF)
