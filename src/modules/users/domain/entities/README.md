# Entities

Las entidades representan objetos con identidad dentro del dominio.

## Archivos

- `user.entity.ts`: entidad `User` con propiedades como `id`, `name`, `email`, `password`, `roleId`, `deleted`, `avatarUrl` y `createdAt`. Usa `Email`, `Password` y `RoleId` como value objects para mantener validaciones.
