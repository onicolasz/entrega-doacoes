import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
  PutBucketCorsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { Queue, Worker } from 'bullmq';
import { createTransport } from 'nodemailer';
import { Database, digest } from './common';
import { uploadSchema } from '@entrega/contracts';
@Injectable()
export class Storage {
  private client = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
  });
  private signer = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT,
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
  });
  private bucket = process.env.S3_BUCKET || 'entrega';
  constructor(@Inject(Database) private db: Database) {}
  async onModuleInit() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode;
      if (status !== 404) throw error;
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
    if (process.env.NODE_ENV !== 'production')
      await this.client.send(
        new PutBucketCorsCommand({
          Bucket: this.bucket,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedOrigins: (process.env.CORS_ORIGINS || 'http://localhost:8081').split(','),
                AllowedMethods: ['GET', 'PUT', 'HEAD'],
                AllowedHeaders: ['*'],
                ExposeHeaders: ['ETag'],
              },
            ],
          },
        }),
      );
  }
  async ownUrls(userId: string, keys: string[]) {
    await this.validate(userId, keys);
    return this.urls(keys);
  }
  async ticket(userId: string, body: unknown) {
    const input = uploadSchema.parse(body);
    const key = `photos/${userId}/${randomUUID()}`;
    const upload = await this.db.upload.create({ data: { userId, key, ...input } });
    const url = await getSignedUrl(
      this.signer,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: input.contentType,
        ContentLength: input.size,
      }),
      { expiresIn: 300 },
    );
    return { id: upload.id, key, url, headers: { 'Content-Type': input.contentType } };
  }
  async confirm(userId: string, id: string) {
    const upload = await this.db.upload.findFirst({ where: { id, userId } });
    if (!upload) throw new NotFoundException('Foto não encontrada');
    if (upload.confirmedAt) return { key: upload.key };
    try {
      const head = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: upload.key }),
      );
      if (head.ContentLength !== upload.size || head.ContentType !== upload.contentType)
        throw new Error('invalid size');
      const object = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: upload.key }),
      );
      const bytes = await object.Body!.transformToByteArray();
      const jpeg = await sharp(bytes, { limitInputPixels: 40000000 })
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: upload.key,
          Body: jpeg,
          ContentType: 'image/jpeg',
          CacheControl: 'private, max-age=300',
        }),
      );
      await this.db.upload.update({
        where: { id },
        data: { confirmedAt: new Date(), contentType: 'image/jpeg', size: jpeg.length },
      });
      return { key: upload.key };
    } catch {
      throw new BadRequestException(
        'A foto não chegou corretamente. Envie uma imagem JPEG, PNG ou WebP de até 8 MB.',
      );
    }
  }
  async validate(userId: string, keys: string[]) {
    if (new Set(keys).size !== keys.length) throw new BadRequestException('Use fotos diferentes');
    const count = await this.db.upload.count({
      where: { userId, key: { in: keys }, confirmedAt: { not: null } },
    });
    if (count !== keys.length)
      throw new BadRequestException('Conclua o envio das fotos antes de continuar');
  }
  async urls(keys: string[]) {
    return Promise.all(
      keys.map((key) =>
        getSignedUrl(this.signer, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
          expiresIn: 3600,
        }),
      ),
    );
  }
  async onModuleDestroy() {
    this.client.destroy();
    this.signer.destroy();
  }
}
@Injectable()
export class Mail {
  private transport = createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT || 51025),
    secure: process.env.SMTP_SECURE === 'true',
    ...(process.env.SMTP_USER
      ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } }
      : {}),
  });
  async send(email: string, purpose: 'verify' | 'reset', token: string) {
    const link = `${process.env.APP_URL || 'entregadoacoes://'}auth-action?purpose=${purpose}&token=${encodeURIComponent(token)}`;
    await this.transport.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject:
        purpose === 'verify'
          ? 'Confirme seu email — Entrega Doações'
          : 'Recupere sua senha — Entrega Doações',
      text: `${purpose === 'verify' ? 'Confirme seu email' : 'Escolha uma nova senha'} no aplicativo:
${link}

Se você não pediu isso, ignore esta mensagem.`,
    });
  }
  onModuleDestroy() {
    this.transport.close();
  }
}
@Injectable()
export class Notifications {
  private queue?: Queue;
  private worker?: Worker;
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  constructor(@Inject(Database) private db: Database) {}
  async onModuleInit() {
    const url = new URL(process.env.REDIS_URL || 'redis://localhost:56379');
    const connection = {
      host: url.hostname,
      port: Number(url.port || 6379),
      username: url.username || undefined,
      password: url.password || undefined,
      ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
      maxRetriesPerRequest: null,
    };
    this.queue = new Queue(`${process.env.QUEUE_NAMESPACE || 'entrega'}-notices`, { connection });
    this.queue.on('error', (error) => console.error('Notification queue:', error.message));
    this.worker = new Worker(
      `${process.env.QUEUE_NAMESPACE || 'entrega'}-notices`,
      async (job) => {
        const event = await this.db.outbox.findUniqueOrThrow({
          where: { id: String(job.data.id) },
        });
        await this.db.notice.createMany({
          data: event.userIds.map((userId) => ({
            id: this.noticeId(event.id, userId),
            userId,
            title: event.title,
            body: event.body,
            path: event.path,
          })),
          skipDuplicates: true,
        });
        const devices = await this.db.device.findMany({ where: { userId: { in: event.userIds } } });
        for (let i = 0; i < devices.length; i += 100) {
          const chunk = devices.slice(i, i + 100);
          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(process.env.EXPO_ACCESS_TOKEN
                ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
                : {}),
            },
            body: JSON.stringify(
              chunk.map((d) => ({
                to: d.token,
                title: event.title,
                body: event.body,
                data: { path: event.path },
                sound: 'default',
              })),
            ),
            signal: AbortSignal.timeout(15000),
          });
          if (!response.ok) throw new Error('Push provider unavailable');
          const result = (await response.json()) as {
            data?: { status: string; details?: { error: string } }[];
          };
          for (const [index, ticket] of (result.data || []).entries()) {
            if (ticket.details?.error === 'DeviceNotRegistered')
              await this.db.device.deleteMany({ where: { token: chunk[index].token } });
            else if (ticket.status === 'error') throw new Error('Push delivery rejected');
          }
        }
      },
      { connection, concurrency: 3 },
    );
    this.worker.on('error', (error) => console.error('Notification worker:', error.message));
    this.timer = setInterval(
      () => void this.flush().catch((error) => console.error('Outbox:', error.message)),
      1000,
    );
    await this.flush();
  }
  private noticeId(eventId: string, userId: string) {
    const h = digest(eventId + userId);
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
  }
  private async flush() {
    if (this.running) return;
    this.running = true;
    try {
      for (const event of await this.db.outbox.findMany({
        where: { sentAt: null },
        orderBy: { createdAt: 'asc' },
        take: 50,
      })) {
        await this.queue!.add(
          'notice',
          { id: event.id },
          {
            jobId: event.id,
            attempts: 5,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 1000,
            removeOnFail: 1000,
          },
        );
        await this.db.outbox.update({ where: { id: event.id }, data: { sentAt: new Date() } });
      }
    } finally {
      this.running = false;
    }
  }
  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.worker?.close();
    if (process.env.NODE_ENV === 'test' && process.env.QUEUE_NAMESPACE?.startsWith('entrega-test-'))
      await this.queue?.obliterate({ force: true });
    await this.queue?.close();
  }
}
