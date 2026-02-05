# Auth Module

Modulo de autenticacion. Contiene controladores, casos de uso y providers para JWT.

## Estructura

- `adapters/`: entrada/salida (HTTP, DTOs, guards).
- `application/`: casos de uso y puertos.
- `domain/`: dominio del modulo (actualmente sin archivos).
- `infrastructure/`: modulo Nest y providers concretos.
- `ports/`: carpeta reservada (sin archivos por ahora).

## Seguridad

- Tokens en cookies `httpOnly` (access y refresh).
- CSRF con cookie `csrf_token` + header `x-csrf-token`.
- Rate limit en endpoints sensibles.
- Bloqueo escalonado por intentos fallidos de login.
