# Repositories (TypeORM)

Repositorios concretos para lectura y escritura de usuarios.

## Archivos

- `typeorm-user.repository.ts`: implementa `UserRepository` usando TypeORM y mapea a dominio con `UserMapper`.
- `typeorm-user.repository.spec.ts`: pruebas unitarias del repositorio de escritura.
- `typeorm-user-read.repository.ts`: consultas de lectura (listados y vistas publicas) con QueryBuilder.
- `typeorm-user-read.repository.spec.ts`: pruebas unitarias del repositorio de lectura.
