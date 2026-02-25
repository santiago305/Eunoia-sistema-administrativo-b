# Use Cases

Casos de uso del modulo de roles.

## Archivos

- `create-role.usecase.ts`: crea un rol nuevo.
- `create-role.usecase.spec.ts`: pruebas unitarias de creacion.
- `list-roles.usecase.ts`: lista roles (por defecto `status: 'all'`; soporta `all | active | inactive`).
- `list-roles.usecase.spec.ts`: pruebas unitarias de listado.
- `get-role-by-id.usecase.ts`: obtiene un rol por id.
- `get-role-by-id.usecase.spec.ts`: pruebas unitarias de consulta por id.
- `update-role.usecase.ts`: actualiza un rol.
- `update-role.usecase.spec.ts`: pruebas unitarias de actualizacion.
- `delete-role.usecase.ts`: marca un rol como eliminado.
- `delete-role.usecase.spec.ts`: pruebas unitarias de eliminacion.
- `restore-role.usecase.ts`: restaura un rol eliminado.
- `restore-role.usecase.spec.ts`: pruebas unitarias de restauracion.
