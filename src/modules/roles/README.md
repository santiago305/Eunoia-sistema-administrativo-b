# Roles Module

Modulo de roles. Define dominio, casos de uso y persistencia de roles.

## Estructura

- `adapters/`: entrada/salida (HTTP, DTOs, persistencia).
- `application/`: casos de uso y puertos.
- `domain/`: entidades, errores y fabricas del dominio.
- `infrastructure/`: modulo Nest y seeders.
- `ports/`: carpeta reservada (sin archivos por ahora).

## Seguridad

- Rutas protegidas con `JwtAuthGuard` y `RolesGuard` (solo ADMIN).

## Listado y escalabilidad

- El listado de roles en lectura usa un filtro `status: 'all' | 'active' | 'inactive'`.
- `GET /roles` resuelve `status = 'all'` por defecto y acepta `?status=all|active|inactive`.
- `GET /roles?status=active` resuelve solo activos.
- `GET /roles?status=inactive` resuelve solo inactivos.

Este cambio corrige el bug funcional de listado y alinea `roles` con el patron de
`users`: un unico endpoint de listado parametrizable por estado.
