/**
 * Compatibilidad para desarrollo.
 *
 * Los datos obligatorios se cargan con `pnpm run seed:base`. Los datos demo
 * deben ejecutarse desde un comando dedicado y nunca durante un despliegue.
 */
import { runBaseSeed } from './src/infrastructure/database/seed-base';

runBaseSeed().catch((error) => {
  console.error('Error al cargar los datos base:', error);
  process.exitCode = 1;
});
