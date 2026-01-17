import { INestApplication } from '@nestjs/common';
import  cookieParser from 'cookie-parser';
import { envs } from '../../config/envs';

/**
 * Habilita el middleware `cookie-parser` en la aplicaciAn NestJS.
 *
 * Este middleware permite leer y firmar cookies en las solicitudes HTTP.
 * Se utiliza una clave secreta (`cookieSecret`) definida en las variables de entorno
 * para firmar cookies y verificar su integridad.
 *
 * @param app - Instancia de la aplicaciAn NestJS (`INestApplication`).
 *
 * @example
 * ```ts
 * import { enableCookieParser } from './middlewares/enable-cookie-parser';
 *
 * async function bootstrap() {
 *   const app = await NestFactory.create(AppModule);
 *   enableCookieParser(app);
 *   await app.listen(3000);
 * }
 * ```
 */
export function enableCookieParser(app: INestApplication): void {
  const cookieSecret = envs.cookieSecret;

  // Agrega cookie-parser con un secret opcional (para firmar cookies si se desea)
  app.use(cookieParser(cookieSecret));
}

