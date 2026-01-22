# Mappers (TypeORM)

Mapeos entre entidades de dominio y entidades ORM.

## Archivos

- `user.mapper.ts`: convierte `User` de dominio a ORM y viceversa; requiere `roleId` para reconstruir y usa `MissingRoleIdError` si falta.
- `user.mapper.spec.ts`: pruebas unitarias del mapper.
