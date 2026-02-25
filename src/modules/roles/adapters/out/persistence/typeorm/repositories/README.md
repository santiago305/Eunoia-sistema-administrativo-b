# Repositories (TypeORM)

Repositorios concretos para roles.

## Archivos

- `typeorm-role.repository.ts`: implementa `RoleRepository` para escritura.
- `typeorm-role.repository.spec.ts`: pruebas unitarias del repo de escritura.
- `typeorm-role-read.repository.ts`: consultas de lectura y busqueda con filtro por estado (`all | active | inactive`).
- `typeorm-role-read.repository.spec.ts`: pruebas unitarias del repo de lectura.

## Nota de mantenimiento

`listRoles()` no debe aplicar un filtro fijo `deleted = false`. El estado se define
por parametro para que `GET /roles` soporte `all | active | inactive` sin duplicar
casos de uso ni endpoints por estado.
