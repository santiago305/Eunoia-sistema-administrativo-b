import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Interceptor que registra el tiempo de ejecuciAn de las solicitudes HTTP.
 *
 * Este interceptor mide cuAnto tarda una solicitud en procesarse
 * y lo muestra en consola en formato:
 * `[METHOD] /ruta - Xms`
 *
 * Es Atil para debugging y monitoreo de rendimiento.
 *
 * @example
 * ```ts
 * @UseInterceptors(LoggingInterceptor)
 * @Get('datos')
 * getData() {
 *   return this.dataService.getAll();
 * }
 * ```
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  /**
   * MAtodo que intercepta la solicitud y mide el tiempo de respuesta.
   *
   * @param context - Contexto de ejecuciAn que contiene detalles de la solicitud.
   * @param next - Handler que continAa el flujo de ejecuciAn del request.
   * @returns Un observable que ejecuta `tap()` para loguear el tiempo de ejecuciAn.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const path = request.path ?? request.url;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        this.logger.log(
          JSON.stringify({
            event: 'http_request_completed',
            method,
            path,
            statusCode: response.statusCode,
            durationMs: Date.now() - now,
          }),
        );
      }),
    );
  }
}

