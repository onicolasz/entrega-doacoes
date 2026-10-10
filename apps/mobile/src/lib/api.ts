import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { type ApiError, type AuthResult, type UploadTicket } from '@entrega/contracts';
import AsyncStorage from '@react-native-async-storage/async-storage';
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3333/v1';
type Credentials = Pick<AuthResult, 'accessToken' | 'refreshToken'>;
let credentials: Credentials | null = null;
let sessionVersion = 0;
let refreshPromise: Promise<void> | null = null;
let listener: ((result: AuthResult | null) => void) | null = null;
const KEY = 'entrega-session-v1';
// React Native's AbortSignal polyfill does not expose the browser timeout() API.
async function fetchWithTimeout(url: string, init: RequestInit = {}, milliseconds = 20000) {
  if (init.signal) return fetch(url, init);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), milliseconds);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
export class RequestError extends Error {
  constructor(
    message: string,
    public status = 0,
    public issues: ApiError['issues'] = [],
  ) {
    super(message);
  }
}
export const onSession = (fn: typeof listener) => {
  listener = fn;
};
export async function persistSession(result: AuthResult | null) {
  sessionVersion++;
  credentials = result
    ? { accessToken: result.accessToken, refreshToken: result.refreshToken }
    : null;
  const value = credentials ? JSON.stringify(credentials) : null;
  if (Platform.OS === 'web') {
    if (typeof sessionStorage !== 'undefined') {
      if (value) sessionStorage.setItem(KEY, value);
      else sessionStorage.removeItem(KEY);
    }
  } else if (value) await SecureStore.setItemAsync(KEY, value);
  else await SecureStore.deleteItemAsync(KEY);
  if (result) await AsyncStorage.setItem('entrega-user-cache', JSON.stringify(result.user));
  else await AsyncStorage.removeItem('entrega-user-cache');
  listener?.(result);
}
export async function restoreCredentials() {
  const value =
    Platform.OS === 'web'
      ? typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem(KEY)
        : null
      : await SecureStore.getItemAsync(KEY);
  try {
    credentials = value ? JSON.parse(value) : null;
  } catch {
    credentials = null;
  }
  return !!credentials;
}
async function refresh() {
  if (!credentials) throw new RequestError('Entre na sua conta', 401);
  if (!refreshPromise) {
    const version = sessionVersion;
    const refreshToken = credentials.refreshToken;
    refreshPromise = (async () => {
      try {
        const result = await request<AuthResult>(
          '/auth/refresh',
          { method: 'POST', body: { refreshToken } },
          false,
        );
        if (version === sessionVersion) await persistSession(result);
      } catch (error) {
        if (version === sessionVersion && error instanceof RequestError && error.status === 401)
          await persistSession(null);
        throw error;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}
export async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
  retry = true,
): Promise<T> {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${API_URL}${path}`, {
      method: options.method || 'GET',
      headers: {
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(credentials ? { Authorization: `Bearer ${credentials.accessToken}` } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      signal: options.signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new RequestError('Não conseguimos conectar. Verifique a internet e tente novamente.');
  }
  if (response.status === 401 && retry && credentials) {
    await refresh();
    return request<T>(path, options, false);
  }
  const data = await response
    .json()
    .catch(() => ({ message: 'O serviço não respondeu corretamente' }));
  if (!response.ok)
    throw new RequestError(
      data.message || 'Não foi possível continuar',
      response.status,
      data.issues,
    );
  return data as T;
}
export async function uploadPhoto(uri: string) {
  const blob = await (await fetch(uri)).blob();
  if (blob.size > 8 * 1024 * 1024) throw new RequestError('Escolha uma foto de até 8 MB');
  const ticket = await request<UploadTicket>('/uploads', {
    method: 'POST',
    body: { size: blob.size, contentType: 'image/jpeg' },
  });
  const result = await fetchWithTimeout(
    ticket.url,
    {
      method: 'PUT',
      headers: ticket.headers,
      body: blob,
    },
    60000,
  );
  if (!result.ok) throw new RequestError('Não foi possível enviar a foto. Tente novamente.');
  await request(`/uploads/${ticket.id}/confirm`, { method: 'POST' });
  return ticket.key;
}
export const errorText = (error: unknown) =>
  error instanceof Error ? error.message : 'Não foi possível continuar. Tente novamente.';
