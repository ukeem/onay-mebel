import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as path from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Security headers
  app.use(helmet());

  // Gzip compression
  app.use(compression());

  // Cookie parser (for httpOnly cookie auth)
  app.use(cookieParser());

  // Global exception filter (hides stack traces in production)
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS
  const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Static files: serve uploads folder
  app.useStaticAssets(path.join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Global prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 4000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Backend running on http://localhost:${port}/api`);
}
bootstrap();
