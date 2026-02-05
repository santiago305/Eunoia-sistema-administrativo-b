# Controllers

Controladores HTTP para autenticacion.

## Archivos

- `auth.controller.ts`: endpoints de login, logout, refresh de token y validacion de token.

## APIs disponibles

Base: `/api/auth`

- `POST /api/auth/login` (publico)
  - Setea cookies: `access_token`, `refresh_token`, `csrf_token`.
- `POST /api/auth/logout` (auth: `JWT` + CSRF)
  - Revoca la sesion actual y limpia cookies.
- `POST /api/auth/refresh` (auth: `JWT` refresh + CSRF)
  - Rota tokens y renueva cookie `csrf_token`.
- `GET /api/auth/validate-token` (auth: `JWT`)
- `GET /api/auth/me` (auth: `JWT`)

## Seguridad

- CSRF: enviar header `x-csrf-token` igual a cookie `csrf_token` en requests sensibles.
- Rate limit: login/refresh/verify-password tienen limites por minuto.
