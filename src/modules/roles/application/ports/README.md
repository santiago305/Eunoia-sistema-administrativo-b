# Ports

Interfaces para repositorios de roles.

## Archivos

- `role.repository.ts`: contrato de escritura y actualizacion.
- `role-read.repository.ts`: contrato de lectura y busqueda.

## Contrato de listado

El puerto `RoleReadRepository` define `listRoles({ status })` con un filtro de estado
explicito y escalable:

- `status: 'all'`: retorna roles activos e inactivos.
- `status: 'active'`: retorna solo roles con `deleted = false`.
- `status: 'inactive'`: retorna solo roles con `deleted = true`.

Esto evita filtros implicitos en infraestructura y permite extender el listado sin
duplicar logica entre endpoints.
