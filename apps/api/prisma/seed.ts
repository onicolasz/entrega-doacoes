import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const db = new PrismaClient();
const s3 = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
});
const bucket = process.env.S3_BUCKET || 'entrega';
const id = (n: number) => `00000000-0000-4000-a000-${String(n).padStart(12, '0')}`;
async function photo(userId: string, name: string) {
  const key = `photos/${userId}/demo-${name}.jpg`;
  const body = await readFile(resolve('prisma/fixtures', `${name}.jpg`));
  await s3.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: 'image/jpeg' }),
  );
  await db.upload.upsert({
    where: { key },
    update: {},
    create: { userId, key, contentType: 'image/jpeg', size: body.length, confirmedAt: new Date() },
  });
  return key;
}
async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo seed cannot run in production');
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  }
  const passwordHash = await hash('Doacao2026!', 12);
  const users = [
    ['ana@example.test', 'Ana Costa', false],
    ['casa@example.test', 'Lucas Souza', false],
    ['rede@example.test', 'Marina Alves', false],
    ['admin@example.test', 'Equipe Entrega', true],
  ] as const;
  for (const [n, [email, name, admin]] of users.entries())
    await db.user.upsert({
      where: { email },
      update: {},
      create: { id: id(n + 1), email, name, admin, passwordHash, verifiedAt: new Date() },
    });
  const clothes = await photo(id(1), 'clothes');
  const food = await photo(id(1), 'food');
  const sofa = await photo(id(1), 'sofa');
  const community = await photo(id(2), 'community');
  const pantry = await photo(id(3), 'food');
  const organizations = [
    {
      id: id(101),
      name: 'Casa do Bem',
      kind: 'COLLECTIVE',
      description:
        'Uma rede de apoio feita por pessoas da comunidade. Conectamos alimentos e itens essenciais a famílias que precisam.',
      email: 'casa@example.test',
      phone: '51999990001',
      needs: 'Alimentos para a cozinha comunitária, roupas e itens de higiene.',
      categories: ['FOOD', 'CLOTHES', 'HYGIENE'],
      city: 'Porto Alegre',
      state: 'RS',
      neighborhood: 'Cidade Baixa',
      street: 'Endereço demonstrativo',
      number: '100',
      latitude: -30.0402,
      longitude: -51.2181,
      photoKeys: [community],
      userId: id(2),
    },
    {
      id: id(102),
      name: 'Rede Circular',
      kind: 'COLLECTIVE',
      description:
        'Damos um novo destino a móveis, roupas e objetos em bom estado. Cada doação fortalece a nossa vizinhança.',
      email: 'rede@example.test',
      phone: '51999990002',
      needs: 'Móveis em bom estado e roupas para todas as idades.',
      categories: ['FURNITURE', 'CLOTHES', 'SCHOOL', 'TOYS'],
      city: 'Porto Alegre',
      state: 'RS',
      neighborhood: 'Bom Fim',
      street: 'Endereço demonstrativo',
      number: '200',
      latitude: -30.032,
      longitude: -51.211,
      photoKeys: [pantry],
      userId: id(3),
    },
  ];
  for (const { userId, ...o } of organizations)
    await db.organization.upsert({
      where: { id: o.id },
      update: {},
      create: {
        ...o,
        status: 'APPROVED',
        evidence: 'Cadastro fictício para demonstração local.',
        memberships: { create: { userId } },
      },
    });
  const common = {
    donorId: id(1),
    condition: 'GOOD',
    city: 'Porto Alegre',
    state: 'RS',
    neighborhood: 'Menino Deus',
    street: 'Endereço demonstrativo de retirada',
    number: '300',
    complement: 'Portaria',
    availability: 'Dias úteis depois das 18h ou sábado pela manhã',
    instructions: 'Avise pelo chat quando chegar.',
    latitude: -30.053,
    longitude: -51.226,
    status: 'AVAILABLE',
  };
  const donations = [
    {
      id: id(201),
      title: 'Roupas prontas para uma nova história',
      description:
        'Um lote de roupas em bom estado, limpas e separadas para doação. Podemos conversar para combinar os tamanhos.',
      category: 'CLOTHES',
      quantity: 12,
      photoKeys: [clothes],
    },
    {
      id: id(202),
      title: 'Sofá para um novo lar',
      description:
        'Sofá de dois lugares em bom estado. É necessário combinar um veículo adequado para a retirada.',
      category: 'FURNITURE',
      quantity: 1,
      photoKeys: [sofa],
    },
    {
      id: id(203),
      title: 'Alimentos para uma cozinha solidária',
      description:
        'Frutas e verduras frescas para a cozinha comunitária. Combine a retirada pelo aplicativo.',
      category: 'FOOD',
      quantity: 10,
      photoKeys: [food],
    },
  ];
  for (const d of donations)
    await db.donation.upsert({ where: { id: d.id }, update: {}, create: { ...common, ...d } });
  await db.interest.upsert({
    where: { id: id(301) },
    update: {},
    create: { id: id(301), donationId: id(203), organizationId: id(101), direction: 'REQUEST' },
  });
  await db.message.upsert({
    where: { senderId_clientId: { senderId: id(2), clientId: id(401) } },
    update: {},
    create: {
      interestId: id(301),
      senderId: id(2),
      clientId: id(401),
      body: 'Oi, Ana! Esses alimentos seriam muito bem-vindos na nossa cozinha. Podemos combinar uma retirada?',
    },
  });
  console.log(
    'Demonstração pronta: ana@example.test, casa@example.test, rede@example.test, admin@example.test. Senha local: Doacao2026!',
  );
}
main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    s3.destroy();
  });
