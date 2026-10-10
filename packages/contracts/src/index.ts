import { z } from 'zod';
export const categories = [
  'FOOD',
  'CLOTHES',
  'FURNITURE',
  'ELECTRONICS',
  'HYGIENE',
  'TOYS',
  'SCHOOL',
  'OTHER',
] as const;
export type Category = (typeof categories)[number];
export const categoryLabels: Record<Category, string> = {
  FOOD: 'Alimentos',
  CLOTHES: 'Roupas e calçados',
  FURNITURE: 'Móveis',
  ELECTRONICS: 'Eletrônicos',
  HYGIENE: 'Higiene',
  TOYS: 'Brinquedos',
  SCHOOL: 'Material escolar',
  OTHER: 'Outros',
};
export const conditions = ['NEW', 'GOOD', 'USED'] as const;
export const conditionLabels = {
  NEW: 'Novo',
  GOOD: 'Em ótimo estado',
  USED: 'Usado, em bom estado',
};
export const statusLabels: Record<string, string> = {
  DRAFT: 'Rascunho',
  AVAILABLE: 'Disponível',
  RESERVED: 'Reservada',
  SCHEDULED: 'Agendada',
  IN_TRANSIT: 'Em transporte',
  RECEIVED: 'Recebida',
  CANCELLED: 'Cancelada',
  PENDING: 'Aguardando resposta',
  ACCEPTED: 'Aceita',
  DECLINED: 'Recusada',
  WITHDRAWN: 'Retirada',
  PROPOSED: 'Horário proposto',
  CONFIRMED: 'Confirmado',
  SUPERSEDED: 'Substituído',
  APPROVED: 'Aprovada',
  REJECTED: 'Não aprovada',
  OPEN: 'Aberta',
  RESOLVED: 'Resolvida',
};
export const modes = ['ORG_PICKUP', 'DONOR_DELIVERY', 'EXTERNAL'] as const;
export const modeLabels = {
  ORG_PICKUP: 'Retirada pela instituição',
  DONOR_DELIVERY: 'Entrega pelo doador',
  EXTERNAL: 'Transporte externo da instituição',
};
const text = (max = 500) => z.string().trim().min(1, 'Preencha este campo').max(max);
export const idSchema = z.string().uuid();
export const emailSchema = z
  .string()
  .trim()
  .email('Informe um email válido')
  .transform((v) => v.toLowerCase());
export const passwordSchema = z.string().min(10, 'Use pelo menos 10 caracteres').max(128);
export const registerSchema = z.object({
  name: text(100),
  email: emailSchema,
  password: passwordSchema,
});
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });
export const addressSchema = z.object({
  city: text(100),
  state: z
    .string()
    .length(2)
    .transform((v) => v.toUpperCase()),
  neighborhood: text(100),
  street: text(150),
  number: text(20),
  complement: z.string().trim().max(150).default(''),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});
export const donationSchema = addressSchema.extend({
  title: text(100),
  description: text(2000),
  category: z.enum(categories),
  condition: z.enum(conditions),
  quantity: z.number().int().min(1).max(100000),
  photoKeys: z.array(z.string().min(1)).min(1, 'Adicione pelo menos uma foto').max(6),
  instructions: z.string().trim().max(1000).default(''),
  availability: text(500),
  publish: z.boolean().default(true),
});
export const draftSchema = donationSchema.partial().extend({
  publish: z.literal(false),
  title: z.string().trim().max(100).optional(),
  description: z.string().trim().max(2000).optional(),
  photoKeys: z.array(z.string().min(1)).max(6).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(2).optional(),
  neighborhood: z.string().trim().max(100).optional(),
  street: z.string().trim().max(150).optional(),
  number: z.string().trim().max(20).optional(),
  availability: z.string().trim().max(500).optional(),
});
export const organizationSchema = addressSchema
  .extend({
    name: text(120),
    kind: z.enum(['NGO', 'COLLECTIVE', 'COLLECTION_POINT']),
    description: text(2000),
    email: emailSchema,
    phone: text(25),
    cnpj: z.string().trim().max(18).optional(),
    evidence: text(2000),
    evidenceKeys: z.array(z.string().min(1)).max(3).default([]),
    photoKeys: z.array(z.string().min(1)).max(6).default([]),
    categories: z.array(z.enum(categories)).min(1),
    needs: text(1000),
  })
  .refine((v) => v.kind !== 'NGO' || !!v.cnpj?.replace(/\D/g, '').match(/^\d{14}$/), {
    message: 'Informe o CNPJ da ONG',
    path: ['cnpj'],
  });
export const interestSchema = z.object({
  organizationId: idSchema,
  direction: z.enum(['REQUEST', 'OFFER']),
});
export const appointmentSchema = z.object({
  scheduledAt: z.string().datetime({ offset: true }),
  mode: z.enum(modes),
  responsible: text(150),
  trackingUrl: z
    .union([
      z
        .string()
        .url()
        .max(1000)
        .refine((v) => v.startsWith('https://'), 'Use um link HTTPS'),
      z.literal(''),
    ])
    .optional(),
  note: z.string().trim().max(1000).default(''),
});
export const messageSchema = z.object({ body: text(2000), clientId: idSchema });
export const uploadSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  size: z
    .number()
    .int()
    .positive()
    .max(8 * 1024 * 1024),
});
export const reportSchema = z.object({
  targetType: z.enum(['DONATION', 'ORGANIZATION', 'USER']),
  targetId: idSchema,
  reason: text(2000),
});
export type DonationInput = z.infer<typeof donationSchema>;
export type OrganizationInput = z.infer<typeof organizationSchema>;
export type AppointmentInput = z.infer<typeof appointmentSchema>;
export interface UserView {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  admin: boolean;
  organizations: OrganizationView[];
}
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: UserView;
}
export interface LocationView {
  city: string;
  state: string;
  neighborhood: string;
  street?: string;
  number?: string;
  complement?: string;
  latitude?: number | null;
  longitude?: number | null;
}
export interface DonationView extends LocationView {
  id: string;
  donorId: string;
  donorName: string;
  title: string;
  description: string;
  category: Category;
  condition: (typeof conditions)[number];
  quantity: number;
  photoKeys: string[];
  photos: string[];
  availability: string;
  instructions?: string;
  status: string;
  createdAt: string;
  distanceKm?: number;
}
export interface OrganizationView extends LocationView {
  id: string;
  name: string;
  kind: string;
  description: string;
  email?: string;
  phone?: string;
  cnpj?: string;
  categories: Category[];
  needs: string;
  status: string;
  reviewNote?: string | null;
  evidence?: string;
  evidencePhotos?: string[];
  photos: string[];
  photoKeys: string[];
  distanceKm?: number;
}
export interface AppointmentView {
  id: string;
  proposedBy: string;
  scheduledAt: string;
  mode: (typeof modes)[number];
  responsible: string;
  trackingUrl: string | null;
  note: string;
  status: string;
}
export interface MatchView {
  id: string;
  status: string;
  appointments: AppointmentView[];
}
export interface InterestView {
  id: string;
  direction: 'REQUEST' | 'OFFER';
  status: string;
  donation: DonationView;
  organization: OrganizationView;
  match: MatchView | null;
  createdAt: string;
  canAccept: boolean;
  canWithdraw: boolean;
}
export interface MessageView {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  clientId: string;
  createdAt: string;
}
export interface NoticeView {
  id: string;
  title: string;
  body: string;
  path: string;
  readAt: string | null;
  createdAt: string;
}
export interface ApiError {
  message: string;
  code?: string;
  issues?: { path: (string | number)[]; message: string }[];
}
export interface UploadTicket {
  id: string;
  key: string;
  url: string;
  headers: Record<string, string>;
}
export interface ReportView {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  resolution: string | null;
  createdAt: string;
}
