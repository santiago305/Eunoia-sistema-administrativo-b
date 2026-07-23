/**
 * Seeder general para desarrollo.
 *
 * `seed:base` se mantiene como el seeder mínimo para despliegues. Este
 * comando, en cambio, carga también los datos operativos necesarios para
 * trabajar localmente: almacenes, estados de pedidos y workflows.
 */
import { runBaseSeed } from './src/infrastructure/database/seed-base';
import { runOrdersSeed } from './src/infrastructure/database/seed-orders';

export async function runSeed(): Promise<void> {
  await runBaseSeed();
  await runOrdersSeed();
}

if (require.main === module) {
  runSeed().catch((error) => {
    console.error('Error al cargar los datos generales:', error);
    process.exitCode = 1;
  });
}
