import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { SignJWT } from 'jose';
import { z } from 'zod';
import {
  type AuthResult,
  emailSchema,
  loginSchema,
  passwordSchema,
  registerSchema,
} from '@entrega/contracts';
import { type Actor, Database, digest, token } from './common';
import { Mail, Storage } from './platform';
@Injectable()
export class Auth {
  constructor(
    @Inject(Database) private db: Database,
    @Inject(Mail) private mail: Mail,
    @Inject(Storage) private storage: Storage,
  ) {}
  async user(userId: string) {
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: userId },
      include: { memberships: { include: { organization: true } } },
    });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      verified: !!user.verifiedAt,
      admin: user.admin,
      organizations: await Promise.all(
        user.memberships.map(async ({ organization: o }) => ({
          id: o.id,
          name: o.name,
          kind: o.kind,
          description: o.description,
          email: o.email,
          phone: o.phone,
          cnpj: o.cnpj || undefined,
          city: o.city,
          state: o.state,
          neighborhood: o.neighborhood,
          street: o.street,
          number: o.number,
          complement: o.complement,
          categories: o.categories as (
            | 'FOOD'
            | 'CLOTHES'
            | 'FURNITURE'
            | 'ELECTRONICS'
            | 'HYGIENE'
            | 'TOYS'
            | 'SCHOOL'
            | 'OTHER'
          )[],
          needs: o.needs,
          status: o.status,
          reviewNote: o.reviewNote,
          photos: await this.storage.urls(o.photoKeys),
          photoKeys: o.photoKeys,
        })),
      ),
    };
  }
  private async signed(userId: string, sessionId: string) {
    return new SignJWT({ sid: sessionId })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuer('entrega-api')
      .setAudience('entrega-app')
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(new TextEncoder().encode(process.env.JWT_SECRET!));
  }
  private async session(userId: string): Promise<AuthResult> {
    const refreshToken = token();
    const session = await this.db.session.create({
      data: {
        userId,
        tokenHash: digest(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 86400000),
      },
    });
    return {
      accessToken: await this.signed(userId, session.id),
      refreshToken,
      user: await this.user(userId),
    };
  }
  async register(body: unknown) {
    const input = registerSchema.parse(body);
    if (await this.db.user.findUnique({ where: { email: input.email } }))
      throw new ConflictException('Este email já está cadastrado');
    const user = await this.db.user.create({
      data: { name: input.name, email: input.email, passwordHash: await hash(input.password, 12) },
    });
    try {
      await this.emailToken(user.id, user.email, 'verify');
    } catch {
      console.error('Verification email unavailable; user can request a new one');
    }
    return this.session(user.id);
  }
  async login(body: unknown) {
    const input = loginSchema.parse(body);
    const user = await this.db.user.findUnique({ where: { email: input.email } });
    if (!user || !(await compare(input.password, user.passwordHash)) || user.blockedAt)
      throw new UnauthorizedException('Email ou senha incorretos');
    return this.session(user.id);
  }
  async refresh(body: unknown): Promise<AuthResult> {
    const { refreshToken } = z.object({ refreshToken: z.string().min(32).max(256) }).parse(body);
    const next = token();
    const session = await this.db.session.findUnique({
      where: { tokenHash: digest(refreshToken) },
      include: { user: true },
    });
    if (!session || session.expiresAt <= new Date() || session.user.blockedAt)
      throw new UnauthorizedException('Entre novamente');
    const claimed = await this.db.session.updateMany({
      where: { id: session.id, tokenHash: digest(refreshToken), expiresAt: { gt: new Date() } },
      data: { tokenHash: digest(next) },
    });
    if (claimed.count !== 1) throw new UnauthorizedException('Entre novamente');
    return {
      accessToken: await this.signed(session.userId, session.id),
      refreshToken: next,
      user: await this.user(session.userId),
    };
  }
  async logout(actor: Actor) {
    await this.db.session.deleteMany({ where: { id: actor.sessionId, userId: actor.userId } });
    return { ok: true };
  }
  private async emailToken(userId: string, email: string, purpose: 'verify' | 'reset') {
    const value = token();
    await this.db.$transaction(async (tx) => {
      await tx.authToken.deleteMany({ where: { userId, purpose } });
      await tx.authToken.create({
        data: {
          userId,
          purpose,
          tokenHash: digest(value),
          expiresAt: new Date(Date.now() + (purpose === 'verify' ? 86400000 : 3600000)),
        },
      });
    });
    await this.mail.send(email, purpose, value);
  }
  async resend(actor: Actor) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: actor.userId } });
    if (!user.verifiedAt) await this.emailToken(user.id, user.email, 'verify');
    return { ok: true };
  }
  async forgot(body: unknown) {
    const { email } = z.object({ email: emailSchema }).parse(body);
    const user = await this.db.user.findUnique({ where: { email } });
    if (user && !user.blockedAt) {
      try {
        await this.emailToken(user.id, user.email, 'reset');
      } catch {
        console.error('Password reset email unavailable');
      }
    }
    return { ok: true };
  }
  async action(body: unknown) {
    const input = z
      .object({
        token: z.string().min(32).max(256),
        purpose: z.enum(['verify', 'reset']),
        password: passwordSchema.optional(),
      })
      .parse(body);
    if (input.purpose === 'reset' && !input.password)
      throw new BadRequestException('Escolha uma nova senha');
    const passwordHash = input.password ? await hash(input.password, 12) : undefined;
    await this.db.$transaction(async (tx) => {
      const t = await tx.authToken.findUnique({ where: { tokenHash: digest(input.token) } });
      if (!t || t.purpose !== input.purpose || t.expiresAt <= new Date())
        throw new BadRequestException('Este link expirou. Peça um novo link.');
      const claim = await tx.authToken.deleteMany({ where: { id: t.id } });
      if (claim.count !== 1) throw new BadRequestException('Este link já foi utilizado');
      await tx.user.update({
        where: { id: t.userId },
        data: input.purpose === 'verify' ? { verifiedAt: new Date() } : { passwordHash },
      });
      if (input.purpose === 'reset') await tx.session.deleteMany({ where: { userId: t.userId } });
    });
    return { ok: true };
  }
  async verified(userId: string) {
    const u = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
    if (!u.verifiedAt) throw new ForbiddenException('Confirme seu email antes de continuar');
  }
}
