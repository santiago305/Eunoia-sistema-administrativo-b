import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpErrorFilter } from './shared/errores/http-exception.filter';
import { LoggingInterceptor } from './shared/utilidades/interceptors/logging.interceptor';
import { envs } from './infrastructure/config/envs';
import { enableCookieParser } from './shared/utilidades/middleware/enable-cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';


async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  //  Servir la carpeta de imAgenes pAblicas
  app.useStaticAssets(join(__dirname, '..', 'assets'), {
    prefix: '/api/assets/',
  });

  app.setGlobalPrefix('api');
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  )

  // usamos el filtro de manera globasl
  app.useGlobalFilters(new HttpErrorFilter());
  enableCookieParser(app);
  // habilitamos el cors
  app.enableCors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin'],
    exposedHeaders: ['Authorization'],
    credentials: true,
  });


  app.use(helmet());
  app.use(compression()); 
  // Usar el interceptor global para logs
  app.useGlobalInterceptors(new LoggingInterceptor());
  // Habilitar el uso de cookies

  await app.listen(envs.port || 3000);
  console.log(`Server is running on port ${envs.port || 3000}`);
}
bootstrap();

