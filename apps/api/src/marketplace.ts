import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Donation, type Organization } from '@prisma/client';
import { z } from 'zod';
import {
  appointmentSchema,
  categories,
  donationSchema,
  draftSchema,
  idSchema,
  interestSchema,
  messageSchema,
  organizationSchema,
  reportSchema,
  type DonationView,
  type OrganizationView,
  type InterestView,
} from '@entrega/contracts';
import { Database } from './common';
import { Auth } from './auth';
import { Storage } from './platform';
const includeInterest = {
  donation: { include: { donor: true } },
  organization: { include: { memberships: true } },
  match: { include: { appointments: { orderBy: { createdAt: 'desc' as const } } } },
} satisfies Prisma.InterestInclude;
type FullInterest = Prisma.InterestGetPayload<{ include: typeof includeInterest }>;
const listSchema = z.object({
  q: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  category: z.enum(categories).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  offset: z.coerce.number().int().min(0).max(10000).default(0),
});
@Injectable()
export class Marketplace {
  constructor(
    @Inject(Database) private db: Database,
    @Inject(Storage) private storage: Storage,
    @Inject(Auth) private auth: Auth,
  ) {}
  private async serial<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.db.$transaction(fn, { isolationLevel: 'Serializable' });
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== 'P2034' ||
          attempt === 2
        )
          throw error;
      }
    }
    throw new ConflictException('Atualize a tela e tente novamente');
  }
  private distance(a?: number | null, b?: number | null, c?: number | null, d?: number | null) {
    if (a == null || b == null || c == null || d == null) return undefined;
    const rad = (v: number) => (v * Math.PI) / 180;
    const x =
      Math.sin(rad(c - a) / 2) ** 2 +
      Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(rad(d - b) / 2) ** 2;
    return Math.round(6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 10) / 10;
  }
  private async donationView(
    d: Donation & { donor?: { name: string } },
    privateAccess = false,
  ): Promise<DonationView> {
    return {
      id: d.id,
      donorId: d.donorId,
      donorName: d.donor?.name || '',
      title: d.title,
      description: d.description,
      category: d.category as DonationView['category'],
      condition: d.condition as DonationView['condition'],
      quantity: d.quantity,
      photoKeys: privateAccess ? d.photoKeys : [],
      photos: await this.storage.urls(d.photoKeys),
      city: d.city,
      state: d.state,
      neighborhood: d.neighborhood,
      availability: d.availability,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
      ...(privateAccess
        ? {
            street: d.street,
            number: d.number,
            complement: d.complement,
            instructions: d.instructions,
            latitude: d.latitude,
            longitude: d.longitude,
          }
        : {}),
    };
  }
  private async orgView(
    o: Organization,
    privateAccess = false,
  ): Promise<OrganizationView & { evidence?: string; evidencePhotos?: string[] }> {
    return {
      id: o.id,
      name: o.name,
      kind: o.kind,
      description: o.description,
      email: o.email,
      phone: o.phone,
      city: o.city,
      state: o.state,
      neighborhood: o.neighborhood,
      street: o.street,
      number: o.number,
      complement: o.complement,
      latitude: o.latitude,
      longitude: o.longitude,
      categories: o.categories as OrganizationView['categories'],
      needs: o.needs,
      status: o.status,
      photos: await this.storage.urls(o.photoKeys),
      photoKeys: privateAccess ? o.photoKeys : [],
      ...(privateAccess
        ? {
            cnpj: o.cnpj || undefined,
            reviewNote: o.reviewNote,
            evidence: o.evidence,
            evidenceKeys: o.evidenceKeys,
            evidencePhotos: await this.storage.urls(o.evidenceKeys),
          }
        : {}),
    };
  }
  private member(i: FullInterest, userId: string) {
    return i.organization.memberships.some((m) => m.userId === userId);
  }
  private participant(i: FullInterest, userId: string) {
    if (i.donation.donorId !== userId && !this.member(i, userId))
      throw new ForbiddenException('Esta conversa pertence a outros participantes');
  }
  private async interestView(i: FullInterest, userId: string): Promise<InterestView> {
    const donor = i.donation.donorId === userId;
    const member = this.member(i, userId);
    return {
      id: i.id,
      direction: i.direction as 'REQUEST' | 'OFFER',
      status: i.status,
      donation: await this.donationView(i.donation, donor || (i.status === 'ACCEPTED' && member)),
      organization: await this.orgView(i.organization),
      match: i.match
        ? {
            id: i.match.id,
            status: i.match.status,
            appointments: i.match.appointments.map((a) => ({
              id: a.id,
              proposedBy: a.proposedBy,
              scheduledAt: a.scheduledAt.toISOString(),
              mode: a.mode as 'ORG_PICKUP' | 'DONOR_DELIVERY' | 'EXTERNAL',
              responsible: a.responsible,
              trackingUrl: a.trackingUrl,
              note: a.note,
              status: a.status,
            })),
          }
        : null,
      createdAt: i.createdAt.toISOString(),
      canAccept:
        i.status === 'PENDING' &&
        ((i.direction === 'REQUEST' && donor) || (i.direction === 'OFFER' && member)),
      canWithdraw:
        i.status === 'PENDING' &&
        ((i.direction === 'OFFER' && donor) || (i.direction === 'REQUEST' && member)),
    };
  }
  private emit(
    tx: Prisma.TransactionClient,
    userIds: string[],
    title: string,
    body: string,
    path: string,
  ) {
    return tx.outbox.create({ data: { userIds: [...new Set(userIds)], title, body, path } });
  }
  async organizations(query: unknown) {
    const f = listSchema.parse(query);
    const rows = await this.db.organization.findMany({
      where: {
        status: 'APPROVED',
        ...(f.city ? { city: { equals: f.city, mode: 'insensitive' } } : {}),
        ...(f.category ? { categories: { has: f.category } } : {}),
        ...(f.q
          ? {
              OR: [
                { name: { contains: f.q, mode: 'insensitive' } },
                { needs: { contains: f.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip: f.offset,
      take: 50,
    });
    const views = await Promise.all(
      rows.map(async (o) => ({
        ...(await this.orgView(o)),
        distanceKm: this.distance(f.latitude, f.longitude, o.latitude, o.longitude),
      })),
    );
    return views.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }
  async organization(id: string, userId?: string) {
    idSchema.parse(id);
    const o = await this.db.organization.findUnique({
      where: { id },
      include: { memberships: true },
    });
    if (!o || (o.status !== 'APPROVED' && !o.memberships.some((m) => m.userId === userId)))
      throw new NotFoundException('Instituição não encontrada');
    return this.orgView(
      o,
      o.memberships.some((m) => m.userId === userId),
    );
  }
  async registerOrganization(userId: string, body: unknown) {
    await this.auth.verified(userId);
    const data = organizationSchema.parse(body);
    await this.storage.validate(userId, [...data.photoKeys, ...data.evidenceKeys]);
    const o = await this.db.organization.create({
      data: { ...data, memberships: { create: { userId } } },
    });
    return this.orgView(o, true);
  }
  async updateOrganization(userId: string, id: string, body: unknown) {
    idSchema.parse(id);
    const data = organizationSchema.parse(body);
    const member = await this.db.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: id } },
    });
    if (!member) throw new ForbiddenException('Você não representa esta instituição');
    await this.storage.validate(userId, [...data.photoKeys, ...data.evidenceKeys]);
    return this.orgView(
      await this.db.organization.update({
        where: { id },
        data: { ...data, status: 'PENDING', reviewNote: null },
      }),
      true,
    );
  }
  async donations(query: unknown) {
    const f = listSchema.parse(query);
    const rows = await this.db.donation.findMany({
      where: {
        status: 'AVAILABLE',
        ...(f.city ? { city: { equals: f.city, mode: 'insensitive' } } : {}),
        ...(f.category ? { category: f.category } : {}),
        ...(f.q
          ? {
              OR: [
                { title: { contains: f.q, mode: 'insensitive' } },
                { description: { contains: f.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { donor: true },
      orderBy: { createdAt: 'desc' },
      skip: f.offset,
      take: 50,
    });
    const views = await Promise.all(
      rows.map(async (d) => ({
        ...(await this.donationView(d)),
        distanceKm: this.distance(f.latitude, f.longitude, d.latitude, d.longitude),
      })),
    );
    return views.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }
  async mine(userId: string) {
    return Promise.all(
      (
        await this.db.donation.findMany({
          where: { donorId: userId },
          include: { donor: true },
          orderBy: { createdAt: 'desc' },
          take: 100,
        })
      ).map((d) => this.donationView(d, true)),
    );
  }
  async donation(id: string, userId?: string) {
    idSchema.parse(id);
    const d = await this.db.donation.findUnique({
      where: { id },
      include: {
        donor: true,
        interests: { include: { organization: { include: { memberships: true } } } },
      },
    });
    if (!d) throw new NotFoundException('Doação não encontrada');
    const owner = d.donorId === userId;
    const accepted = d.interests.some(
      (i) => i.status === 'ACCEPTED' && i.organization.memberships.some((m) => m.userId === userId),
    );
    if (!owner && !accepted && d.status !== 'AVAILABLE')
      throw new NotFoundException('Doação indisponível');
    return this.donationView(d, owner || accepted);
  }
  async saveDonation(userId: string, body: unknown, id?: string) {
    if (id) idSchema.parse(id);
    const old = id ? await this.db.donation.findUnique({ where: { id } }) : null;
    if (id && (!old || old.donorId !== userId))
      throw new ForbiddenException('Você não pode alterar esta doação');
    if (old && !['DRAFT', 'AVAILABLE'].includes(old.status))
      throw new ConflictException('Esta doação já está em andamento');
    const publish = z.object({ publish: z.boolean().default(true) }).parse(body).publish;
    const merged = old ? { ...old, ...(body as Record<string, unknown>) } : body;
    const input = publish ? donationSchema.parse(merged) : draftSchema.parse(merged);
    if (publish) await this.auth.verified(userId);
    await this.storage.validate(userId, input.photoKeys || []);
    const { publish: _publish, ...fields } = input;
    const data = {
      title: '',
      description: '',
      category: 'OTHER',
      condition: 'GOOD',
      quantity: 1,
      photoKeys: [],
      city: '',
      state: 'RS',
      neighborhood: '',
      street: '',
      number: '',
      complement: '',
      instructions: '',
      availability: '',
      ...fields,
      status: publish ? 'AVAILABLE' : 'DRAFT',
    };
    const d = await this.serial(async (tx) => {
      if (id) {
        const changed = await tx.donation.updateMany({
          where: { id, donorId: userId, status: { in: ['DRAFT', 'AVAILABLE'] } },
          data,
        });
        if (!changed.count) throw new ConflictException('A doação mudou. Atualize a tela.');
        if (!publish) await this.withdrawPending(tx, id, data.title);
        return tx.donation.findUniqueOrThrow({ where: { id }, include: { donor: true } });
      }
      return tx.donation.create({ data: { ...data, donorId: userId }, include: { donor: true } });
    });
    return this.donationView(d, true);
  }
  private async withdrawPending(tx: Prisma.TransactionClient, donationId: string, title: string) {
    const pending = await tx.interest.findMany({
      where: { donationId, status: 'PENDING' },
      include: { organization: { include: { memberships: true } } },
    });
    await tx.interest.updateMany({
      where: { donationId, status: 'PENDING' },
      data: { status: 'WITHDRAWN' },
    });
    for (const i of pending)
      await this.emit(
        tx,
        i.organization.memberships.map((m) => m.userId),
        'Anúncio retirado',
        title,
        `/connection/${i.id}`,
      );
  }
  async archiveDonation(userId: string, id: string) {
    idSchema.parse(id);
    await this.serial(async (tx) => {
      const changed = await tx.donation.updateMany({
        where: { id, donorId: userId, status: { in: ['DRAFT', 'AVAILABLE'] } },
        data: { status: 'CANCELLED' },
      });
      if (!changed.count) throw new ConflictException('A doação já está em andamento ou não é sua');
      const donation = await tx.donation.findUniqueOrThrow({ where: { id } });
      await this.withdrawPending(tx, id, donation.title);
    });
    return { ok: true };
  }
  async createInterest(userId: string, donationId: string, body: unknown) {
    idSchema.parse(donationId);
    await this.auth.verified(userId);
    const input = interestSchema.parse(body);
    const i = await this.serial(async (tx) => {
      const donation = await tx.donation.findUnique({ where: { id: donationId } });
      const organization = await tx.organization.findUnique({
        where: { id: input.organizationId },
        include: { memberships: true },
      });
      if (!donation || donation.status !== 'AVAILABLE')
        throw new ConflictException('Esta doação não está mais disponível');
      if (!organization || organization.status !== 'APPROVED')
        throw new BadRequestException('A instituição precisa estar aprovada');
      const member = organization.memberships.some((m) => m.userId === userId);
      const donor = donation.donorId === userId;
      if (
        (input.direction === 'REQUEST' && !member) ||
        (input.direction === 'OFFER' && !donor) ||
        organization.memberships.some((m) => m.userId === donation.donorId)
      )
        throw new ForbiddenException('Escolha uma instituição diferente para esta doação');
      const existing = await tx.interest.findFirst({
        where: { donationId, organizationId: organization.id, status: 'PENDING' },
      });
      if (existing) throw new ConflictException('Já existe uma conversa sobre esta doação');
      const interest = await tx.interest.create({
        data: { donationId, ...input },
        include: includeInterest,
      });
      await this.emit(
        tx,
        input.direction === 'REQUEST'
          ? [donation.donorId]
          : organization.memberships.map((m) => m.userId),
        input.direction === 'REQUEST'
          ? 'Uma instituição quer receber sua doação'
          : 'Você recebeu uma oferta',
        donation.title,
        `/connection/${interest.id}`,
      );
      return interest;
    });
    return this.interestView(i, userId);
  }
  async interests(userId: string) {
    return Promise.all(
      (
        await this.db.interest.findMany({
          where: {
            OR: [
              { donation: { donorId: userId } },
              { organization: { memberships: { some: { userId } } } },
            ],
          },
          include: includeInterest,
          orderBy: { createdAt: 'desc' },
          take: 100,
        })
      ).map((i) => this.interestView(i, userId)),
    );
  }
  async interest(userId: string, id: string) {
    idSchema.parse(id);
    const i = await this.db.interest.findUnique({ where: { id }, include: includeInterest });
    if (!i) throw new NotFoundException('Conversa não encontrada');
    this.participant(i, userId);
    return this.interestView(i, userId);
  }
  async respond(userId: string, id: string, body: unknown) {
    idSchema.parse(id);
    await this.auth.verified(userId);
    const { action } = z.object({ action: z.enum(['accept', 'decline', 'withdraw']) }).parse(body);
    const result = await this.serial(async (tx) => {
      const i = await tx.interest.findUnique({ where: { id }, include: includeInterest });
      if (!i) throw new NotFoundException('Solicitação não encontrada');
      this.participant(i, userId);
      if (i.status !== 'PENDING') throw new ConflictException('Esta solicitação já foi respondida');
      const recipient =
        i.direction === 'REQUEST' ? i.donation.donorId === userId : this.member(i, userId);
      if ((action === 'withdraw' && recipient) || (action !== 'withdraw' && !recipient))
        throw new ForbiddenException('A outra parte precisa responder');
      if (action === 'accept') {
        if (i.organization.status !== 'APPROVED')
          throw new ForbiddenException('A instituição precisa estar aprovada');
        const claimed = await tx.donation.updateMany({
          where: { id: i.donationId, status: 'AVAILABLE' },
          data: { status: 'RESERVED' },
        });
        if (!claimed.count) throw new ConflictException('Outra instituição já recebeu esta doação');
        await tx.interest.update({ where: { id }, data: { status: 'ACCEPTED' } });
        await tx.match.create({ data: { interestId: id } });
        const others = await tx.interest.findMany({
          where: { donationId: i.donationId, status: 'PENDING', id: { not: id } },
          include: { organization: { include: { memberships: true } } },
        });
        await tx.interest.updateMany({
          where: { donationId: i.donationId, status: 'PENDING', id: { not: id } },
          data: { status: 'DECLINED' },
        });
        for (const other of others)
          await this.emit(
            tx,
            other.organization.memberships.map((m) => m.userId),
            'Esta doação já foi reservada',
            i.donation.title,
            `/connection/${other.id}`,
          );
      } else
        await tx.interest.update({
          where: { id },
          data: { status: action === 'decline' ? 'DECLINED' : 'WITHDRAWN' },
        });
      await this.emit(
        tx,
        [i.donation.donorId, ...i.organization.memberships.map((m) => m.userId)].filter(
          (u) => u !== userId,
        ),
        action === 'accept' ? 'Doação reservada' : 'Solicitação atualizada',
        i.donation.title,
        `/connection/${id}`,
      );
      return tx.interest.findUniqueOrThrow({ where: { id }, include: includeInterest });
    });
    return this.interestView(result, userId);
  }
  async propose(userId: string, id: string, body: unknown) {
    idSchema.parse(id);
    const input = appointmentSchema.parse(body);
    if (new Date(input.scheduledAt) <= new Date())
      throw new BadRequestException('Escolha um horário no futuro');
    await this.serial(async (tx) => {
      const i = await tx.interest.findUnique({ where: { id }, include: includeInterest });
      if (!i || !i.match) throw new NotFoundException('Conexão não encontrada');
      this.participant(i, userId);
      if (!['RESERVED', 'SCHEDULED'].includes(i.match.status))
        throw new ConflictException('Esta entrega não pode ser reagendada');
      await tx.appointment.updateMany({
        where: { matchId: i.match.id, status: { in: ['PROPOSED', 'CONFIRMED'] } },
        data: { status: 'SUPERSEDED' },
      });
      await tx.appointment.create({
        data: {
          ...input,
          trackingUrl: input.trackingUrl || null,
          scheduledAt: new Date(input.scheduledAt),
          matchId: i.match.id,
          proposedBy: userId,
        },
      });
      await tx.match.update({ where: { id: i.match.id }, data: { status: 'RESERVED' } });
      await this.emit(
        tx,
        [i.donation.donorId, ...i.organization.memberships.map((m) => m.userId)].filter(
          (u) => u !== userId,
        ),
        'Confirme o horário da doação',
        i.donation.title,
        `/connection/${id}`,
      );
    });
    return this.interest(userId, id);
  }
  async confirmAppointment(userId: string, id: string, appointmentId: string) {
    idSchema.parse(id);
    idSchema.parse(appointmentId);
    await this.serial(async (tx) => {
      const i = await tx.interest.findUnique({ where: { id }, include: includeInterest });
      if (!i || !i.match) throw new NotFoundException('Conexão não encontrada');
      this.participant(i, userId);
      const a = i.match.appointments.find((a) => a.id === appointmentId && a.status === 'PROPOSED');
      if (!a || i.match.status !== 'RESERVED')
        throw new ConflictException('O horário mudou. Atualize a tela.');
      if ((a.proposedBy === i.donation.donorId) === (userId === i.donation.donorId))
        throw new ForbiddenException('O horário deve ser confirmado pela outra parte');
      if (a.scheduledAt <= new Date())
        throw new ConflictException('Este horário já passou. Proponha um novo horário.');
      await tx.appointment.update({ where: { id: a.id }, data: { status: 'CONFIRMED' } });
      await tx.match.update({ where: { id: i.match.id }, data: { status: 'SCHEDULED' } });
      await this.emit(
        tx,
        [i.donation.donorId, ...i.organization.memberships.map((m) => m.userId)].filter(
          (u) => u !== userId,
        ),
        'Coleta agendada',
        i.donation.title,
        `/connection/${id}`,
      );
    });
    return this.interest(userId, id);
  }
  async transition(userId: string, id: string, body: unknown) {
    idSchema.parse(id);
    const { action } = z.object({ action: z.enum(['transit', 'receive', 'cancel']) }).parse(body);
    await this.serial(async (tx) => {
      const i = await tx.interest.findUnique({ where: { id }, include: includeInterest });
      if (!i?.match) throw new NotFoundException('Conexão não encontrada');
      this.participant(i, userId);
      const donor = i.donation.donorId === userId;
      if (['RECEIVED', 'CANCELLED'].includes(i.match.status))
        throw new ConflictException('Esta entrega já foi encerrada');
      if (action === 'transit') {
        const a = i.match.appointments.find((a) => a.status === 'CONFIRMED');
        if (i.match.status !== 'SCHEDULED' || !a)
          throw new ConflictException('Confirme o horário primeiro');
        if ((a.mode === 'DONOR_DELIVERY') !== donor)
          throw new ForbiddenException('O responsável pelo transporte deve iniciar a entrega');
        await tx.match.update({ where: { id: i.match.id }, data: { status: 'IN_TRANSIT' } });
      } else if (action === 'receive') {
        if (donor) throw new ForbiddenException('A instituição confirma o recebimento');
        if (!['SCHEDULED', 'IN_TRANSIT'].includes(i.match.status))
          throw new ConflictException('Agende a entrega primeiro');
        await tx.match.update({ where: { id: i.match.id }, data: { status: 'RECEIVED' } });
        await tx.donation.update({ where: { id: i.donationId }, data: { status: 'RECEIVED' } });
      } else {
        await tx.match.update({ where: { id: i.match.id }, data: { status: 'CANCELLED' } });
        await tx.interest.update({ where: { id }, data: { status: 'WITHDRAWN' } });
        await tx.appointment.updateMany({
          where: { matchId: i.match.id, status: { in: ['PROPOSED', 'CONFIRMED'] } },
          data: { status: 'CANCELLED' },
        });
        await tx.donation.update({ where: { id: i.donationId }, data: { status: 'AVAILABLE' } });
      }
      await this.emit(
        tx,
        [i.donation.donorId, ...i.organization.memberships.map((m) => m.userId)].filter(
          (u) => u !== userId,
        ),
        action === 'receive'
          ? 'Doação recebida. Obrigado!'
          : action === 'cancel'
            ? 'Entrega cancelada'
            : 'Doação em transporte',
        i.donation.title,
        `/connection/${id}`,
      );
    });
    return this.interest(userId, id);
  }
  async messages(userId: string, id: string, before?: string) {
    await this.interest(userId, id);
    if (before) {
      idSchema.parse(before);
      const cursor = await this.db.message.findFirst({ where: { id: before, interestId: id } });
      if (!cursor) throw new NotFoundException('Mensagem não encontrada');
    }
    const rows = await this.db.message.findMany({
      where: { interestId: id },
      include: { sender: { select: { name: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50,
      ...(before ? { cursor: { id: before }, skip: 1 } : {}),
    });
    return rows.reverse().map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderName: m.sender.name,
      body: m.body,
      clientId: m.clientId,
      createdAt: m.createdAt.toISOString(),
    }));
  }
  async sendMessage(userId: string, id: string, body: unknown) {
    idSchema.parse(id);
    const input = messageSchema.parse(body);
    await this.auth.verified(userId);
    await this.serial(async (tx) => {
      const i = await tx.interest.findUnique({ where: { id }, include: includeInterest });
      if (!i) throw new NotFoundException('Conversa não encontrada');
      this.participant(i, userId);
      if (!['PENDING', 'ACCEPTED'].includes(i.status) || i.match?.status === 'RECEIVED')
        throw new ConflictException('Esta conversa foi encerrada');
      const prior = await tx.message.findUnique({
        where: { senderId_clientId: { senderId: userId, clientId: input.clientId } },
      });
      if (prior) {
        if (prior.interestId !== id || prior.body !== input.body)
          throw new ConflictException('Identificador de mensagem já utilizado');
        return;
      }
      await tx.message.create({ data: { ...input, senderId: userId, interestId: id } });
      await this.emit(
        tx,
        [i.donation.donorId, ...i.organization.memberships.map((m) => m.userId)].filter(
          (u) => u !== userId,
        ),
        'Nova mensagem',
        input.body.slice(0, 120),
        `/chat/${id}`,
      );
    });
    return this.messages(userId, id);
  }
  async admin(userId: string) {
    if (!(await this.db.user.findUniqueOrThrow({ where: { id: userId } })).admin)
      throw new ForbiddenException('Acesso exclusivo da administração');
  }
  async reviewQueue(userId: string) {
    await this.admin(userId);
    return Promise.all(
      (
        await this.db.organization.findMany({
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'asc' },
        })
      ).map((o) => this.orgView(o, true)),
    );
  }
  async reviewOrganization(userId: string, id: string, body: unknown) {
    await this.admin(userId);
    idSchema.parse(id);
    const input = z
      .object({
        status: z.enum(['APPROVED', 'REJECTED']),
        note: z.string().trim().max(1000).default(''),
      })
      .parse(body);
    await this.serial(async (tx) => {
      const o = await tx.organization.findUniqueOrThrow({
        where: { id },
        include: { memberships: true },
      });
      await tx.organization.update({
        where: { id },
        data: { status: input.status, reviewNote: input.note },
      });
      await this.emit(
        tx,
        o.memberships.map((m) => m.userId),
        input.status === 'APPROVED' ? 'Instituição aprovada' : 'Cadastro precisa de ajustes',
        input.note || o.name,
        '/profile',
      );
    });
    return { ok: true };
  }
  async report(userId: string, body: unknown) {
    const input = reportSchema.parse(body);
    const exists =
      input.targetType === 'DONATION'
        ? await this.db.donation.count({ where: { id: input.targetId } })
        : input.targetType === 'ORGANIZATION'
          ? await this.db.organization.count({ where: { id: input.targetId } })
          : await this.db.user.count({ where: { id: input.targetId } });
    if (!exists) throw new NotFoundException('Registro não encontrado');
    return this.db.report.create({ data: { userId, ...input } });
  }
  async reports(userId: string) {
    await this.admin(userId);
    return this.db.report.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }
  async resolveReport(userId: string, id: string, body: unknown) {
    await this.admin(userId);
    idSchema.parse(id);
    const { resolution } = z.object({ resolution: z.string().trim().min(1).max(2000) }).parse(body);
    return this.db.report.update({ where: { id }, data: { resolution, status: 'RESOLVED' } });
  }
}
