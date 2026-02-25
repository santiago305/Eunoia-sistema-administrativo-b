# DTOs

DTOs con validaciones para las operaciones de usuario.

## Archivos

- `change-password.dto.ts`: valida `currentPassword` y `newPassword`.
- `create-user.dto.ts`: valida los campos necesarios para crear usuario (`roleId` es opcional; si no se envia, el caso de uso asigna `ADVISER`).
- `update-user.dto.ts`: version parcial de `CreateUserDto` para actualizaciones.
