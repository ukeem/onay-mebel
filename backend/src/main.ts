import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as path from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { configureBodyParsers } from './http-body-limits';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
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

  // Keep JSON parsing bounded before authentication/validation.
  configureBodyParsers(app);

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

  // CORS — restrict to frontend URL in production, allow any in dev
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? [frontendUrl] : true,
    credentials: true,
  });

  // Static files: serve uploads folder
  const uploadDir = path.resolve(
    process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
  );
  app.useStaticAssets(uploadDir, {
    prefix: '/uploads/',
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Graceful shutdown — triggers onModuleDestroy (Prisma disconnect, etc.)
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 4000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Backend running on http://localhost:${port}/api`);
}
bootstrap();
