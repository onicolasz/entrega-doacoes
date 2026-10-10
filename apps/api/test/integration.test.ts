import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { hash } from 'bcryptjs';
import sharp from 'sharp';
import { type INestApplication } from '@nestjs/common';
import {
  type AuthResult,
  type DonationView,
  type InterestView,
  type MessageView,
  type OrganizationView,
  type UploadTicket,
} from '@entrega/contracts';
import { createApp } from '../src/app';
import { Database } from '../src/common';
const password = 'Doacao2026!';
let app: INestApplication;
let db: Database;
let base: string;
let donor: AuthResult;
let staff: AuthResult;
let otherStaff: AuthResult;
let outsider: AuthResult;
let admin: AuthResult;
let teammate: AuthResult;
let orgId: string;
let otherOrgId: string;
let photoKey: string;
const ids: string[] = [];
const prefix = randomUUID().slice(0, 8);
async function rpc<T>(
  who: AuthResult | null,
  path: string,
  method = 'GET',
  body?: unknown,
  expected = method === 'POST' ? 201 : 200,
): Promise<T> {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(who ? { Authorization: `Bearer ${who.accessToken}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await res.json();
  assert.equal(
    res.status,
    expected,
    `${method} ${path}: ${data.message || 'unexpected HTTP status'}`,
  );
  return data;
}
async function login(email: string) {
  return rpc<AuthResult>(null, '/auth/login', 'POST', { email, password });
}
async function user(label: string, isAdmin = false) {
  const u = await db.user.create({
    data: {
      email: `${prefix}-${label}@example.test`,
      name: label,
      passwordHash: await hash(password, 4),
      verifiedAt: new Date(),
      admin: isAdmin,
    },
  });
  ids.push(u.id);
  return login(u.email);
}
const address = {
  city: 'Porto Alegre',
  state: 'RS',
  neighborhood: 'Centro',
  street: 'Rua Privada de Teste',
  number: '123',
  complement: 'Apartamento 45',
  latitude: -30.03,
  longitude: -51.23,
};
async function donation(title = 'Lote de roupas', publish = true) {
  return rpc<DonationView>(donor, '/donations', 'POST', {
    ...address,
    title,
    description: 'Um lote em bom estado para doação',
    category: 'CLOTHES',
    condition: 'GOOD',
    quantity: 3,
    photoKeys: [photoKey],
    availability: 'Dias úteis depois das 18h',
    instructions: 'Ligar pelo chat ao chegar',
    publish,
  });
}
async function interest(
  d: DonationView,
  who = staff,
  organizationId = orgId,
  direction = 'REQUEST',
) {
  return rpc<InterestView>(who, `/donations/${d.id}/interests`, 'POST', {
    organizationId,
    direction,
  });
}
async function upload(who: AuthResult, bytes?: Buffer) {
  const data =
    bytes ||
    (await sharp({ create: { width: 32, height: 32, channels: 3, background: '#006b5e' } })
      .jpeg()
      .toBuffer());
  const ticket = await rpc<UploadTicket>(who, '/uploads', 'POST', {
    contentType: 'image/jpeg',
    size: data.length,
  });
  const put = await fetch(ticket.url, {
    method: 'PUT',
    headers: ticket.headers,
    body: new Uint8Array(data),
  });
  assert.equal(put.status, 200);
  return ticket;
}
const tomorrow = () => new Date(Date.now() + 86400000).toISOString();
async function propose(who: AuthResult, id: string, mode = 'ORG_PICKUP') {
  return rpc<InterestView>(who, `/interests/${id}/appointments`, 'POST', {
    scheduledAt: tomorrow(),
    mode,
    responsible: 'Equipe da instituição',
    note: 'Chegar pela entrada principal',
  });
}
async function accept(d: DonationView) {
  const i = await interest(d);
  return rpc<InterestView>(donor, `/interests/${i.id}/respond`, 'POST', { action: 'accept' });
}
async function emailToken(email: string, purpose: string) {
  const inbox = (await (await fetch('http://localhost:58025/api/v1/messages')).json()) as {
    messages: { ID: string; To: { Address: string }[] }[];
  };
  const message = inbox.messages.find((m) => m.To.some((t) => t.Address === email));
  assert.ok(message, 'Email delivered to Mailpit');
  const full = (await (
    await fetch(`http://localhost:58025/api/v1/message/${message.ID}`)
  ).json()) as { Text: string };
  const token = full.Text.match(/token=([a-f0-9]{64})/)?.[1];
  assert.ok(token, `${purpose} email contains a token`);
  return token;
}
before(async () => {
  process.env.NODE_ENV = 'test';
  process.env.QUEUE_NAMESPACE = `entrega-test-${prefix}`;
  const url = new URL(process.env.TEST_DATABASE_URL || '');
  const name = url.pathname.slice(1);
  assert.match(
    name,
    /^[a-zA-Z0-9_]+_test$/,
    'Tests require a dedicated TEST_DATABASE_URL ending in _test',
  );
  const root = new URL(url);
  root.pathname = '/postgres';
  const owner = new Database({ datasources: { db: { url: root.toString() } } });
  const exists = await owner.$queryRaw<
    { datname: string }[]
  >`SELECT datname FROM pg_database WHERE datname=${name}`;
  if (!exists.length) await owner.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  await owner.$disconnect();
  process.env.DATABASE_URL = url.toString();
  execFileSync(
    process.execPath,
    [
      resolve('node_modules/prisma/build/index.js'),
      'migrate',
      'deploy',
      '--schema',
      'prisma/schema.prisma',
    ],
    { env: process.env, stdio: 'pipe' },
  );
  app = await createApp();
  await app.listen(0, '127.0.0.1');
  base = `${await app.getUrl()}/v1`;
  db = app.get(Database);
  donor = await user('donor');
  staff = await user('staff');
  otherStaff = await user('other-staff');
  outsider = await user('outsider');
  admin = await user('admin', true);
  teammate = await user('teammate');
  const data = {
    ...address,
    kind: 'COLLECTIVE',
    description: 'Instituição para os testes',
    email: 'instituicao@example.test',
    phone: '51999999999',
    evidence: 'Representante e evidência institucional para análise',
    categories: ['CLOTHES'],
    needs: 'Roupas para a comunidade',
  };
  const o = await rpc<OrganizationView>(staff, '/organizations', 'POST', {
    ...data,
    name: `${prefix} Instituição A`,
  });
  orgId = o.id;
  const o2 = await rpc<OrganizationView>(otherStaff, '/organizations', 'POST', {
    ...data,
    name: `${prefix} Instituição B`,
  });
  otherOrgId = o2.id;
  await rpc(admin, `/admin/organizations/${orgId}/review`, 'POST', { status: 'APPROVED' });
  await rpc(admin, `/admin/organizations/${otherOrgId}/review`, 'POST', { status: 'APPROVED' });
  await db.membership.create({ data: { userId: teammate.user.id, organizationId: orgId } });
  const ticket = await upload(donor);
  photoKey = (await rpc<{ key: string }>(donor, `/uploads/${ticket.id}/confirm`, 'POST')).key;
});
after(async () => {
  if (app) await app.close();
});
describe('Donation lifecycle and permissions', () => {
  it('keeps precise pickup location private before acceptance and from unrelated users', async () => {
    const d = await donation();
    const publicRows = await rpc<DonationView[]>(null, '/donations');
    const publicItem = publicRows.find((x) => x.id === d.id)!;
    assert.equal(publicItem.street, undefined);
    assert.equal(publicItem.latitude, undefined);
    assert.equal(publicItem.instructions, undefined);
    assert.deepEqual(publicItem.photoKeys, []);
    const before = await interest(d);
    assert.equal(before.donation.street, undefined);
    await rpc(outsider, `/interests/${before.id}`, 'GET', undefined, 403);
    await rpc(outsider, `/conversations/${before.id}/messages`, 'GET', undefined, 403);
    const result = await rpc<InterestView>(donor, `/interests/${before.id}/respond`, 'POST', {
      action: 'accept',
    });
    assert.equal(result.match?.status, 'RESERVED');
    const accepted = await rpc<InterestView>(staff, `/interests/${before.id}`);
    assert.equal(accepted.donation.street, address.street);
    assert.equal(accepted.donation.instructions, 'Ligar pelo chat ao chegar');
    await rpc(outsider, `/donations/${d.id}`, 'GET', undefined, 404);
  });
  it('allows exactly one of two competing reservations', async () => {
    const d = await donation('Disputa simultânea');
    const a = await interest(d);
    const b = await interest(d, otherStaff, otherOrgId);
    const statuses = await Promise.all(
      [a, b].map(
        async (i) =>
          (
            await fetch(`${base}/interests/${i.id}/respond`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${donor.accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ action: 'accept' }),
            })
          ).status,
      ),
    );
    assert.deepEqual(statuses.sort(), [201, 409]);
    assert.equal(await db.interest.count({ where: { donationId: d.id, status: 'ACCEPTED' } }), 1);
    assert.equal(await db.match.count({ where: { interest: { donationId: d.id } } }), 1);
  });
  it('supports a direct donor offer and requires the institution to accept', async () => {
    const d = await donation('Oferta direta');
    const i = await interest(d, donor, orgId, 'OFFER');
    assert.equal(i.canAccept, false);
    assert.equal(i.canWithdraw, true);
    await rpc(donor, `/interests/${i.id}/respond`, 'POST', { action: 'accept' }, 403);
    await rpc(outsider, `/interests/${i.id}/respond`, 'POST', { action: 'accept' }, 403);
    const accepted = await rpc<InterestView>(staff, `/interests/${i.id}/respond`, 'POST', {
      action: 'accept',
    });
    assert.equal(accepted.match?.status, 'RESERVED');
  });
  it('requires opposite-party confirmation and invalidates a previous schedule after rescheduling', async () => {
    const i = await accept(await donation('Agendamento'));
    const first = await propose(staff, i.id);
    const a = first.match!.appointments[0];
    await rpc(staff, `/interests/${i.id}/appointments/${a.id}/confirm`, 'POST', undefined, 403);
    await rpc(teammate, `/interests/${i.id}/appointments/${a.id}/confirm`, 'POST', undefined, 403);
    await rpc(staff, `/interests/${i.id}/status`, 'POST', { action: 'transit' }, 409);
    await rpc(donor, `/interests/${i.id}/appointments/${a.id}/confirm`, 'POST');
    const next = await propose(donor, i.id, 'DONOR_DELIVERY');
    const b = next.match!.appointments.find((a) => a.status === 'PROPOSED')!;
    assert.equal(next.match!.status, 'RESERVED');
    assert.equal(next.match!.appointments.find((x) => x.id === a.id)!.status, 'SUPERSEDED');
    await rpc(donor, `/interests/${i.id}/appointments/${a.id}/confirm`, 'POST', undefined, 409);
    await rpc(staff, `/interests/${i.id}/appointments/${b.id}/confirm`, 'POST');
    await rpc(staff, `/interests/${i.id}/status`, 'POST', { action: 'transit' }, 403);
    await rpc(donor, `/interests/${i.id}/status`, 'POST', { action: 'transit' });
    await rpc(donor, `/interests/${i.id}/status`, 'POST', { action: 'receive' }, 403);
    const done = await rpc<InterestView>(staff, `/interests/${i.id}/status`, 'POST', {
      action: 'receive',
    });
    assert.equal(done.match!.status, 'RECEIVED');
    assert.equal(done.donation.status, 'RECEIVED');
    await rpc(staff, `/interests/${i.id}/status`, 'POST', { action: 'cancel' }, 409);
  });
  it('returns a cancelled donation to discovery and hides its address from the former institution', async () => {
    const d = await donation('Cancelar');
    const i = await accept(d);
    await rpc(staff, `/interests/${i.id}/status`, 'POST', { action: 'cancel' });
    const old = await rpc<InterestView>(staff, `/interests/${i.id}`);
    assert.equal(old.donation.street, undefined);
    assert.equal(old.match!.status, 'CANCELLED');
    const reopened = await rpc<DonationView>(outsider, `/donations/${d.id}`);
    assert.equal(reopened.status, 'AVAILABLE');
    await interest(d, otherStaff, otherOrgId);
  });
  it('stores incomplete drafts privately and validates them when publishing', async () => {
    const d = await rpc<DonationView>(donor, '/donations', 'POST', {
      publish: false,
      title: '',
      photoKeys: [],
    });
    assert.equal(d.status, 'DRAFT');
    await rpc(outsider, `/donations/${d.id}`, 'GET', undefined, 404);
    await rpc(donor, `/donations/${d.id}`, 'PATCH', { publish: true }, 422);
  });
  it('withdraws pending conversations when a donor archives or unpublishes a lot', async () => {
    for (const action of ['archive', 'draft']) {
      const d = await donation(`Withdraw ${action}`);
      const i = await interest(d);
      if (action === 'archive') await rpc(donor, `/donations/${d.id}`, 'DELETE');
      else await rpc(donor, `/donations/${d.id}`, 'PATCH', { publish: false });
      const closed = await rpc<InterestView>(staff, `/interests/${i.id}`);
      assert.equal(closed.status, 'WITHDRAWN');
      await rpc(
        staff,
        `/conversations/${i.id}/messages`,
        'POST',
        {
          body: 'Mensagem depois do encerramento',
          clientId: randomUUID(),
        },
        409,
      );
      await rpc(donor, `/interests/${i.id}/respond`, 'POST', { action: 'accept' }, 409);
      assert.ok(
        await db.outbox.findFirst({
          where: { path: `/connection/${i.id}`, userIds: { has: staff.user.id } },
        }),
      );
    }
  });
  it('serializes competing receipt and cancellation without reopening a received donation', async () => {
    const i = await accept(await donation('Recebimento simultâneo'));
    const scheduled = await propose(donor, i.id);
    await rpc(
      staff,
      `/interests/${i.id}/appointments/${scheduled.match!.appointments[0].id}/confirm`,
      'POST',
    );
    const statuses = await Promise.all(
      ['receive', 'cancel'].map(
        async (action) =>
          (
            await fetch(`${base}/interests/${i.id}/status`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${staff.accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ action }),
            })
          ).status,
      ),
    );
    assert.deepEqual(statuses.sort(), [201, 409]);
    const final = await rpc<InterestView>(staff, `/interests/${i.id}`);
    assert.equal(
      final.donation.status,
      final.match!.status === 'RECEIVED' ? 'RECEIVED' : 'AVAILABLE',
    );
  });
  it('rejects duplicate interests and unauthorized changes to a reserved lot', async () => {
    const d = await donation('Duplicado');
    const i = await interest(d);
    await rpc(
      staff,
      `/donations/${d.id}/interests`,
      'POST',
      { organizationId: orgId, direction: 'REQUEST' },
      409,
    );
    await rpc(donor, `/interests/${i.id}/respond`, 'POST', { action: 'accept' });
    await rpc(donor, `/donations/${d.id}`, 'PATCH', { publish: false, title: 'Alterado' }, 409);
    await rpc(donor, `/donations/${d.id}`, 'DELETE', undefined, 409);
  });
});
describe('Photos, conversations and administration', () => {
  it('confirms valid images, rejects invalid bytes and enforces ownership', async () => {
    const good = await upload(donor);
    await rpc(outsider, `/uploads/${good.id}/confirm`, 'POST', undefined, 404);
    await rpc(donor, `/uploads/${good.id}/confirm`, 'POST');
    const urls = await rpc<string[]>(donor, '/uploads/urls', 'POST', { keys: [good.key] });
    assert.equal((await fetch(urls[0])).status, 200);
    await rpc(outsider, '/uploads/urls', 'POST', { keys: [good.key] }, 400);
    const bad = await upload(donor, Buffer.from('<script>not an image</script>'));
    await rpc(donor, `/uploads/${bad.id}/confirm`, 'POST', undefined, 400);
    await rpc(donor, '/uploads', 'POST', { contentType: 'image/jpeg', size: 9 * 1024 * 1024 }, 422);
  });
  it('deduplicates message retries and paginates older history', async () => {
    const d = await donation('Conversa');
    const i = await interest(d);
    const body = { body: 'Olá, podemos combinar a retirada?', clientId: randomUUID() };
    await rpc<MessageView[]>(staff, `/conversations/${i.id}/messages`, 'POST', body);
    const retry = await rpc<MessageView[]>(staff, `/conversations/${i.id}/messages`, 'POST', body);
    assert.equal(retry.length, 1);
    await rpc(
      outsider,
      `/conversations/${i.id}/messages`,
      'POST',
      { body: 'Intruso', clientId: randomUUID() },
      403,
    );
    await db.message.createMany({
      data: Array.from({ length: 55 }, (_, n) => ({
        interestId: i.id,
        senderId: donor.user.id,
        body: `Histórico ${n}`,
        clientId: randomUUID(),
        createdAt: new Date(Date.now() + n),
      })),
    });
    const recent = await rpc<MessageView[]>(staff, `/conversations/${i.id}/messages`);
    assert.equal(recent.length, 50);
    const previous = await rpc<MessageView[]>(
      staff,
      `/conversations/${i.id}/messages?before=${recent[0].id}`,
    );
    assert.equal(previous.length, 6);
    assert.equal(new Set([...recent, ...previous].map((m) => m.id)).size, 56);
  });
  it('keeps approval evidence private and gates institutional participation', async () => {
    const pending = await rpc<OrganizationView>(outsider, '/organizations', 'POST', {
      ...address,
      name: `${prefix} Pendente`,
      kind: 'COLLECTIVE',
      description: 'Descrição',
      email: 'pendente@example.test',
      phone: '51999999999',
      evidence: 'Informação privada do responsável',
      categories: ['CLOTHES'],
      needs: 'Roupas',
    });
    await rpc(
      outsider,
      `/admin/organizations/${pending.id}/review`,
      'POST',
      { status: 'APPROVED' },
      403,
    );
    await rpc(null, `/organizations/${pending.id}`, 'GET', undefined, 404);
    await rpc(
      staff,
      `/donations/${(await donation()).id}/interests`,
      'POST',
      { organizationId: pending.id, direction: 'REQUEST' },
      400,
    );
    const privateView = await rpc<OrganizationView>(
      outsider,
      `/organizations/${pending.id}/manage`,
    );
    assert.equal(privateView.evidence, 'Informação privada do responsável');
    await rpc(admin, `/admin/organizations/${pending.id}/review`, 'POST', {
      status: 'APPROVED',
      note: 'Aprovada',
    });
    const visible = await rpc<OrganizationView>(null, `/organizations/${pending.id}`);
    assert.equal(visible.evidence, undefined);
  });
  it('records and resolves reports with administrator authorization', async () => {
    const d = await donation('Relato');
    const report = await rpc<{ id: string }>(staff, '/reports', 'POST', {
      targetType: 'DONATION',
      targetId: d.id,
      reason: 'Informações inconsistentes',
    });
    await rpc(staff, '/admin/reports', 'GET', undefined, 403);
    await rpc(admin, `/admin/reports/${report.id}/resolve`, 'POST', {
      resolution: 'Relato analisado e contato realizado',
    });
    assert.equal(
      (await db.report.findUniqueOrThrow({ where: { id: report.id } })).status,
      'RESOLVED',
    );
  });
  it('persists actionable notifications through the outbox worker', async () => {
    const d = await donation('Notificação');
    const i = await interest(d);
    for (let n = 0; n < 50; n++) {
      if (await db.notice.count({ where: { userId: donor.user.id, path: `/connection/${i.id}` } }))
        break;
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.equal(
      await db.notice.count({ where: { userId: donor.user.id, path: `/connection/${i.id}` } }),
      1,
    );
    const notices = await rpc<{ id: string; path: string }[]>(donor, '/notices');
    const notice = notices.find((n) => n.path === `/connection/${i.id}`)!;
    await rpc(donor, `/notices/${notice.id}/read`, 'POST');
    assert.ok((await db.notice.findUniqueOrThrow({ where: { id: notice.id } })).readAt);
  });
});
describe('Authentication', () => {
  it('rotates refresh tokens atomically and revokes access on logout', async () => {
    const u = await user('rotation');
    const statuses = await Promise.all(
      [1, 2].map(async () => {
        const res = await fetch(base + '/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: u.refreshToken }),
        });
        return res.status;
      }),
    );
    assert.deepEqual(statuses.sort(), [201, 401]);
    await rpc(u, '/auth/logout', 'POST');
    await rpc(u, '/auth/me', 'GET', undefined, 401);
  });
  it('confirms email once, resets a password, and revokes previous sessions', async () => {
    const email = `${prefix}-registration@example.test`;
    const account = await rpc<AuthResult>(null, '/auth/register', 'POST', {
      name: 'Nova pessoa',
      email,
      password,
    });
    assert.equal(account.user.verified, false);
    ids.push(account.user.id);
    await rpc(
      account,
      '/organizations',
      'POST',
      {
        ...address,
        name: 'Sem verificação',
        kind: 'COLLECTIVE',
        description: 'Teste',
        email,
        phone: '51999999999',
        evidence: 'Teste',
        categories: ['CLOTHES'],
        needs: 'Roupas',
      },
      403,
    );
    const verify = await emailToken(email, 'verify');
    await rpc(null, '/auth/action', 'POST', { purpose: 'verify', token: verify });
    await rpc(null, '/auth/action', 'POST', { purpose: 'verify', token: verify }, 400);
    assert.equal((await rpc<AuthResult['user']>(account, '/auth/me')).verified, true);
    await rpc(null, '/auth/forgot', 'POST', { email });
    const reset = await emailToken(email, 'reset');
    await rpc(null, '/auth/action', 'POST', {
      purpose: 'reset',
      token: reset,
      password: 'NovaSenha2026!',
    });
    await rpc(account, '/auth/me', 'GET', undefined, 401);
    await rpc(null, '/auth/login', 'POST', { email, password }, 401);
    await rpc(null, '/auth/login', 'POST', { email, password: 'NovaSenha2026!' });
  });
});
