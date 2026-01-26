# Controllers

Controladores HTTP para autenticacion.

## Archivos

- `auth.controller.ts`: endpoints de login, logout, refresh de token y validacion de token.

## APIs disponibles

Base: `/api/auth`

- `POST /api/auth/login` (publico)
- `POST /api/auth/logout` (auth: `JWT`)
- `GET /api/auth/refresh` (auth: `JWT` refresh)
- `GET /api/auth/validate-token` (auth: `JWT`)
- `GET /api/auth/me` (auth: `JWT`)
