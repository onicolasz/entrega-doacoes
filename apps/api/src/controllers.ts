import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import {
  appointmentSchema,
  donationSchema,
  emailSchema,
  idSchema,
  interestSchema,
  loginSchema,
  messageSchema,
  organizationSchema,
  passwordSchema,
  registerSchema,
  reportSchema,
  uploadSchema,
} from '@entrega/contracts';
import { ApiInput, type AuthedRequest, Database, Public } from './common';
import { Auth } from './auth';
import { Marketplace } from './marketplace';
import { Storage } from './platform';
@ApiTags('Autenticação')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(@Inject(Auth) private auth: Auth) {}
  @Public() @Post('register') @ApiInput(registerSchema) register(@Body() body: unknown) {
    return this.auth.register(body);
  }
  @Public() @Post('login') @ApiInput(loginSchema) login(@Body() body: unknown) {
    return this.auth.login(body);
  }
  @Public() @Post('refresh') @ApiInput(z.object({ refreshToken: z.string() })) refresh(
    @Body() body: unknown,
  ) {
    return this.auth.refresh(body);
  }
  @Public() @Post('forgot') @ApiInput(z.object({ email: emailSchema })) forgot(
    @Body() body: unknown,
  ) {
    return this.auth.forgot(body);
  }
  @Public()
  @Post('action')
  @ApiInput(
    z.object({
      token: z.string(),
      purpose: z.enum(['verify', 'reset']),
      password: passwordSchema.optional(),
    }),
  )
  action(@Body() body: unknown) {
    return this.auth.action(body);
  }
  @Get('me') me(@Req() req: AuthedRequest) {
    return this.auth.user(req.actor.userId);
  }
  @Post('logout') logout(@Req() req: AuthedRequest) {
    return this.auth.logout(req.actor);
  }
  @Post('resend') resend(@Req() req: AuthedRequest) {
    return this.auth.resend(req.actor);
  }
}
@ApiTags('Instituições')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(@Inject(Marketplace) private market: Marketplace) {}
  @Public() @Get() list(@Query() q: unknown) {
    return this.market.organizations(q);
  }
  @Get(':id/manage')
  @ApiOperation({ summary: 'Perfil completo da instituição representada, incluindo evidências' })
  manage(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.market.organization(id, req.actor.userId);
  }
  @Public() @Get(':id') detail(@Param('id') id: string) {
    return this.market.organization(id);
  }
  @Post() @ApiInput(organizationSchema) register(@Req() req: AuthedRequest, @Body() body: unknown) {
    return this.market.registerOrganization(req.actor.userId, body);
  }
  @Patch(':id') @ApiInput(organizationSchema) update(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.market.updateOrganization(req.actor.userId, id, body);
  }
}
@ApiTags('Doações')
@ApiBearerAuth()
@Controller('donations')
export class DonationsController {
  constructor(@Inject(Marketplace) private market: Marketplace) {}
  @Public() @Get() list(@Query() q: unknown) {
    return this.market.donations(q);
  }
  @Get('mine') mine(@Req() req: AuthedRequest) {
    return this.market.mine(req.actor.userId);
  }
  @Get(':id') detail(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.market.donation(id, req.actor.userId);
  }
  @Post()
  @ApiInput(donationSchema)
  @ApiOperation({ summary: 'Publicar doação ou salvar campos parciais com publish=false' })
  create(@Req() req: AuthedRequest, @Body() body: unknown) {
    return this.market.saveDonation(req.actor.userId, body);
  }
  @Patch(':id') @ApiInput(donationSchema) update(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.market.saveDonation(req.actor.userId, body, id);
  }
  @Delete(':id') archive(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.market.archiveDonation(req.actor.userId, id);
  }
  @Post(':id/interests') @ApiInput(interestSchema) interest(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.market.createInterest(req.actor.userId, id, body);
  }
}
@ApiTags('Conexões e agendamento')
@ApiBearerAuth()
@Controller('interests')
export class InterestsController {
  constructor(@Inject(Marketplace) private market: Marketplace) {}
  @Get() list(@Req() req: AuthedRequest) {
    return this.market.interests(req.actor.userId);
  }
  @Get(':id') detail(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.market.interest(req.actor.userId, id);
  }
  @Post(':id/respond')
  @ApiInput(z.object({ action: z.enum(['accept', 'decline', 'withdraw']) }))
  respond(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.market.respond(req.actor.userId, id, body);
  }
  @Post(':id/appointments') @ApiInput(appointmentSchema) propose(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.market.propose(req.actor.userId, id, body);
  }
  @Post(':id/appointments/:appointmentId/confirm') confirm(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Param('appointmentId') aid: string,
  ) {
    return this.market.confirmAppointment(req.actor.userId, id, aid);
  }
  @Post(':id/status')
  @ApiInput(z.object({ action: z.enum(['transit', 'receive', 'cancel']) }))
  status(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.market.transition(req.actor.userId, id, body);
  }
}
@ApiTags('Conversas')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationsController {
  constructor(@Inject(Marketplace) private market: Marketplace) {}
  @Get() list(@Req() req: AuthedRequest) {
    return this.market.interests(req.actor.userId);
  }
  @Get(':id/messages') messages(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Query('before') before?: string,
  ) {
    return this.market.messages(req.actor.userId, id, before);
  }
  @Post(':id/messages') @ApiInput(messageSchema) send(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.market.sendMessage(req.actor.userId, id, body);
  }
}
@ApiTags('Fotos')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(@Inject(Storage) private storage: Storage) {}
  @Post() @ApiInput(uploadSchema) create(@Req() req: AuthedRequest, @Body() body: unknown) {
    return this.storage.ticket(req.actor.userId, body);
  }
  @Post('urls') @ApiInput(z.object({ keys: z.array(z.string()).max(9) })) urls(
    @Req() req: AuthedRequest,
    @Body() body: unknown,
  ) {
    const { keys } = z.object({ keys: z.array(z.string()).max(9) }).parse(body);
    return this.storage.ownUrls(req.actor.userId, keys);
  }
  @Post(':id/confirm') confirm(@Req() req: AuthedRequest, @Param('id') id: string) {
    idSchema.parse(id);
    return this.storage.confirm(req.actor.userId, id);
  }
}
@ApiTags('Administração e denúncias')
@ApiBearerAuth()
@Controller()
export class AdminController {
  constructor(@Inject(Marketplace) private market: Marketplace) {}
  @Post('reports') @ApiInput(reportSchema) report(
    @Req() req: AuthedRequest,
    @Body() body: unknown,
  ) {
    return this.market.report(req.actor.userId, body);
  }
  @Get('admin/organizations') organizations(@Req() req: AuthedRequest) {
    return this.market.reviewQueue(req.actor.userId);
  }
  @Post('admin/organizations/:id/review')
  @ApiInput(z.object({ status: z.enum(['APPROVED', 'REJECTED']), note: z.string() }))
  review(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.market.reviewOrganization(req.actor.userId, id, body);
  }
  @Get('admin/reports') reports(@Req() req: AuthedRequest) {
    return this.market.reports(req.actor.userId);
  }
  @Post('admin/reports/:id/resolve') @ApiInput(z.object({ resolution: z.string() })) resolve(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.market.resolveReport(req.actor.userId, id, body);
  }
}
@ApiTags('Notificações')
@ApiBearerAuth()
@Controller()
export class NoticesController {
  constructor(@Inject(Database) private db: Database) {}
  @Get('notices') list(@Req() req: AuthedRequest) {
    return this.db.notice.findMany({
      where: { userId: req.actor.userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
  @Post('notices/:id/read') read(@Req() req: AuthedRequest, @Param('id') id: string) {
    idSchema.parse(id);
    return this.db.notice.updateMany({
      where: { id, userId: req.actor.userId },
      data: { readAt: new Date() },
    });
  }
  @Post('devices') @ApiInput(z.object({ token: z.string() })) device(
    @Req() req: AuthedRequest,
    @Body() body: unknown,
  ) {
    const input = z
      .object({ token: z.string().regex(/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/) })
      .parse(body);
    return this.db.device.upsert({
      where: { token: input.token },
      update: { userId: req.actor.userId },
      create: { userId: req.actor.userId, ...input },
    });
  }
  @Delete('devices') @ApiInput(z.object({ token: z.string() })) remove(
    @Req() req: AuthedRequest,
    @Body() body: unknown,
  ) {
    const { token } = z.object({ token: z.string().max(300) }).parse(body);
    return this.db.device.deleteMany({ where: { userId: req.actor.userId, token } });
  }
}
@ApiTags('Serviço')
@Controller('health')
export class HealthController {
  constructor(@Inject(Database) private db: Database) {}
  @Public() @Get() async health() {
    await this.db.$queryRaw`SELECT 1`;
    return { status: 'ok', service: 'entrega-api' };
  }
}
