import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { envs } from '../config/envs';

/**
 * MAdulo de base de datos que configura la conexiAn a cualquier base de datos usando TypeORM.
 *
 * Utiliza `TypeOrmModule.forRootAsync` para cargar la configuraciAn de manera dinAmica
 * desde las variables de entorno definidas en `envs`. TambiAn activa la carga automAtica
 * de entidades y la sincronizaciAn del esquema (solo recomendable en desarrollo).
 *
 * @remarks
 * - `synchronize: true` permite sincronizar entidades con la base de datos automAticamente.
 *   AI Esto no debe usarse en producciAn porque puede borrar datos ya que es como un auto-migrador.
 * - `autoLoadEntities: true` permite registrar automAticamente las entidades en los mAdulos.
 * - `logging: true` habilita logs de consultas y errores en consola (Atil para debug).
 *
 * @example
 * ```ts
 * @Module(
 *   imports: [DatabaseModule],
 * })
 * export class AppModule {}
 * ```
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => ({
        type: 'postgres',
        host: envs.db.host,
        port: envs.db.port,
        username: envs.db.username,
        password: envs.db.password,
        database: envs.db.name,
        synchronize: true, //  SOLO EN DESARROLLO
        autoLoadEntities: true,
        logging: true,
      }),
    }),
  ],
})
export class DatabaseModule {}

