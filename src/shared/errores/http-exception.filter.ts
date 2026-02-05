import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { status } from '../constantes/constants';

@Catch(HttpException)
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let type = status.ERROR;
    let message = 'Error desconocido';
    let details: unknown = null;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      if ((exceptionResponse as any).type) {
        type = (exceptionResponse as any).type;
      }
      if ((exceptionResponse as any).message) {
        const extractedMessage = (exceptionResponse as any).message;
        message = Array.isArray(extractedMessage)
          ? extractedMessage.join(' | ')
          : extractedMessage;
      }
      if ((exceptionResponse as any).details) {
        details = (exceptionResponse as any).details;
      }
    } else if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    }

    response.status(statusCode).json({
      type,
      message,
      ...(details ? { details } : {}),
    });
  }
}
