# Controllers

Controladores HTTP para autenticacion.

## Archivos

- `auth.controller.ts`: endpoints de login, logout, refresh de token y validacion de token.

## APIs disponibles

Base: `/auth`

- `POST /auth/login` (publico)
- `POST /auth/logout` (auth: `JWT`)
- `GET /auth/refresh` (auth: `JWT` refresh)
- `GET /auth/validate-token` (auth: `JWT`)
