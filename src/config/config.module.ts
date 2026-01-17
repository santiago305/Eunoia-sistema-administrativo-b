import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envs } from './envs';

/**
 * MAdulo de configuraciAn de la aplicaciAn.
 *
 * Este mAdulo carga las variables de entorno definidas en `envs` y las expone globalmente
 * mediante el `ConfigModule` de NestJS. Esto permite acceder a la configuraciAn
 * en cualquier parte de la aplicaciAn sin necesidad de importar el mAdulo manualmente.
 *
 * @remarks
 * - `isGlobal: true` hace que el `ConfigModule` estA disponible en toda la aplicaciAn.
 * - `load: [() => envs]` permite cargar una configuraciAn personalizada desde un archivo.
 *
 * @example
 * ```ts
 * @Injectable()
 * export class SomeService {
 *   constructor(@Inject(ConfigService) private config: ConfigService) {
 *     const dbHost = this.config.get('DATABASE_HOST');
 *   }
 * }
 * ```
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => envs],
    }),
  ],
  exports: [ConfigModule],
})
export class AppConfigModule {}

