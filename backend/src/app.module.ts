import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CalculationsModule } from './calculations/calculations.module';
import { CatalogModule } from './catalog/catalog.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { ProjectsModule } from './projects/projects.module';
import { RoomsModule } from './rooms/rooms.module';
import { SettingsModule } from './settings/settings.module';
import { SharedModule } from './shared/shared.module';
import { SmsModule } from './sms/sms.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';
import { WsModule } from './ws/ws.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(4000),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required().min(16),
        JWT_REFRESH_SECRET: Joi.string().required().min(16),
        JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
        JWT_REFRESH_EXPIRES: Joi.string().default('7d'),
        FRONTEND_URL: Joi.string().default('http://localhost:3000'),
        SUPER_ADMIN_PHONE: Joi.string().required(),
        SUPER_ADMIN_PASSWORD: Joi.string().required().min(8),
        UPLOAD_DIR: Joi.string().default('./uploads'),
        JSON_BODY_LIMIT_BYTES: Joi.number()
          .integer()
          .min(1024)
          .max(2 * 1024 * 1024)
          .default(2 * 1024 * 1024),
        UPLOAD_USER_LIMIT_BYTES: Joi.number()
          .integer()
          .min(5 * 1024 * 1024)
          .max(1024 * 1024 * 1024)
          .default(100 * 1024 * 1024),
        UPLOAD_TOTAL_LIMIT_BYTES: Joi.number()
          .integer()
          .min(100 * 1024 * 1024)
          .max(5 * 1024 * 1024 * 1024)
          .default(1024 * 1024 * 1024),

        // Notifications (optional)
        SMTP_HOST: Joi.string().optional().allow(''),
        SMTP_PORT: Joi.number().optional().default(587),
        SMTP_USER: Joi.string().optional().allow(''),
        SMTP_PASS: Joi.string().optional().allow(''),
        SMTP_FROM: Joi.string().optional().allow(''),
        NOTIFY_EMAIL: Joi.string().optional().allow(''),
        TELEGRAM_BOT_TOKEN: Joi.string().optional().allow(''),
        TELEGRAM_CHAT_ID: Joi.string().optional().allow(''),
      }),
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'short',
          ttl: 1000, // 1 second
          limit: 10, // 10 requests per second
        },
        {
          name: 'medium',
          ttl: 60000, // 1 minute
          limit: 100, // 100 requests per minute
        },
      ],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    SharedModule,
    AuthModule,
    UsersModule,
    SmsModule,
    CatalogModule,
    SettingsModule,
    ProjectsModule,
    RoomsModule,
    ProductsModule,
    CalculationsModule,
    UploadsModule,
    WsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
