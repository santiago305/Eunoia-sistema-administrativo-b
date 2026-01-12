import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { envs } from '../config/envs';

/**
 * Módulo de base de datos que configura la conexión a cualquier base de datos usando TypeORM.
 *
 * Utiliza `TypeOrmModule.forRootAsync` para cargar la configuración de manera dinámica
 * desde las variables de entorno definidas en `envs`. También activa la carga automática
 * de entidades y la sincronización del esquema (solo recomendable en desarrollo).
 *
 * @remarks
 * - `synchronize: true` permite sincronizar entidades con la base de datos automáticamente.
 *   ⚠️ Esto no debe usarse en producción porque puede borrar datos ya que es como un auto-migrador.
 * - `autoLoadEntities: true` permite registrar automáticamente las entidades en los módulos.
 * - `logging: true` habilita logs de consultas y errores en consola (útil para debug).
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
