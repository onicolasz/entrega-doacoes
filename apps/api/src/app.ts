import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { rateLimit } from 'express-rate-limit';
import { AuthGuard, Database, Errors } from './common';
import { Auth } from './auth';
import { Mail, Notifications, Storage } from './platform';
import { Marketplace } from './marketplace';
import {
  AuthController,
  OrganizationsController,
  DonationsController,
  InterestsController,
  ConversationsController,
  UploadsController,
  AdminController,
  NoticesController,
  HealthController,
} from './controllers';
@Module({
  controllers: [
    AuthController,
    OrganizationsController,
    DonationsController,
    InterestsController,
    ConversationsController,
    UploadsController,
    AdminController,
    NoticesController,
    HealthController,
  ],
  providers: [
    Database,
    Auth,
    Storage,
    Mail,
    Notifications,
    Marketplace,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
export async function createApp() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
    throw new Error('JWT_SECRET must contain at least 32 characters');
  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.includes('development-only'))
    throw new Error('Set a production JWT_SECRET');
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'test' ? false : ['error', 'warn', 'log'],
  });
  if (process.env.TRUST_PROXY)
    app.getHttpAdapter().getInstance().set('trust proxy', Number(process.env.TRUST_PROXY));
  app.setGlobalPrefix('v1');
  app.useGlobalFilters(new Errors());
  const allowed = new Set((process.env.CORS_ORIGINS || 'http://localhost:8081').split(','));
  app.enableCors({
    origin: (origin: string | undefined, cb: (err: Error | null, allowed: boolean) => void) =>
      cb(null, !origin || allowed.has(origin)),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.use(
    '/v1/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: process.env.NODE_ENV === 'test' ? 500 : 60,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'Muitas tentativas. Aguarde alguns minutos.' },
    }),
  );
  app.use(
    rateLimit({
      windowMs: 60000,
      limit: process.env.NODE_ENV === 'test' ? 2000 : 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'Aguarde um momento e tente novamente.' },
    }),
  );
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Entrega Doações API')
      .setDescription(
        'Doações, conexões e logística. Endereços de retirada são privados até a reserva.',
      )
      .setVersion('1.0.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('docs', app, document);
  await app.init();
  return app;
}
