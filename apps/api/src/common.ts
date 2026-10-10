import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Injectable,
  UnauthorizedException,
  SetMetadata,
  CanActivate,
  ExecutionContext,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaClient, Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { ZodError, type ZodTypeAny } from 'zod';
import { ApiBody } from '@nestjs/swagger';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { Request, Response } from 'express';
import { jwtVerify, type JWTPayload } from 'jose';
export type Actor = { userId: string; sessionId: string };
export type AuthedRequest = Request & { actor: Actor };
export const Public = () => SetMetadata('public', true);
export const ApiInput = (schema: ZodTypeAny) =>
  ApiBody({
    schema: zodToJsonSchema(schema, { target: 'openApi3', $refStrategy: 'none' }),
  } as Parameters<typeof ApiBody>[0]);
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const token = () => randomBytes(32).toString('hex');
@Injectable()
export class Database extends PrismaClient {
  async onModuleInit() {
    await this.$connect();
  }
  async onApplicationShutdown() {
    await this.$disconnect();
  }
}
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private reflector: Reflector,
    @Inject(Database) private db: Database,
  ) {}
  async canActivate(context: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride<boolean>('public', [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const bearer = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!bearer) throw new UnauthorizedException('Entre na sua conta para continuar');
    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(bearer, new TextEncoder().encode(process.env.JWT_SECRET!), {
        issuer: 'entrega-api',
        audience: 'entrega-app',
        algorithms: ['HS256'],
      }));
    } catch {
      throw new UnauthorizedException('Sua sessão expirou. Entre novamente.');
    }
    if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string')
      throw new UnauthorizedException('Entre novamente');
    // Database outages must not masquerade as revoked sessions.
    const session = await this.db.session.findFirst({
      where: { id: payload.sid, userId: payload.sub, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!session || session.user.blockedAt)
      throw new UnauthorizedException('Sua sessão expirou. Entre novamente.');
    req.actor = { userId: session.userId, sessionId: session.id };
    return true;
  }
}
@Catch()
export class Errors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (error instanceof ZodError) {
      res.status(422).json({
        message: 'Confira os campos destacados',
        issues: error.issues.map((i) => ({ path: i.path, message: i.message })),
      });
      return;
    }
    if (error instanceof HttpException) {
      res.status(error.getStatus()).json({ message: error.message });
      return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        res.status(409).json({ message: 'Este registro já existe' });
        return;
      }
      if (error.code === 'P2025') {
        res.status(404).json({ message: 'Registro não encontrado' });
        return;
      }
    }
    console.error('Unhandled API error', error instanceof Error ? error.message : 'unknown');
    res.status(500).json({ message: 'Não foi possível concluir. Tente novamente.' });
  }
}
