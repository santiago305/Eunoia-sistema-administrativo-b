# Errors

Errores específicos del dominio que representan violaciones a las reglas de negocio
durante la validación o reconstrucción de un Usuario.

## Archivos

- `invalid-email.error.ts`  
  Se lanza cuando el email no cumple el formato válido definido por el dominio.

- `invalid-password.error.ts`  
  Se lanza cuando el password no cumple las reglas de seguridad del dominio.

- `invalid-role-id.error.ts`  
  Se lanza cuando el `roleId` proporcionado no es válido.

- `missing-role-id.error.ts`  
  Se lanza cuando falta el `roleId` al crear o reconstruir una instancia de `User`.
