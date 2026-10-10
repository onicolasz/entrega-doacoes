import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { type AuthResult, type UserView } from '@entrega/contracts';
import { onSession, persistSession, request, restoreCredentials, RequestError } from './api';
type Role = { kind: 'donor' | 'organization'; organizationId?: string };
type AuthContextValue = {
  user: UserView | null;
  loading: boolean;
  role: Role;
  setRole: (role: Role) => void;
  signIn: (result: AuthResult) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserView | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRoleState] = useState<Role>({ kind: 'donor' });
  const query = useQueryClient();
  useEffect(() => {
    let live = true;
    onSession((result) => {
      if (!live) return;
      setUser(result?.user || null);
      if (!result) {
        setRoleState({ kind: 'donor' });
        query.clear();
      }
    });
    (async () => {
      try {
        if (await restoreCredentials()) {
          let current: UserView;
          try {
            current = await request<UserView>('/auth/me');
          } catch (error) {
            if (error instanceof RequestError && error.status === 401) throw error;
            const cached = await AsyncStorage.getItem('entrega-user-cache');
            if (!cached) throw error;
            current = JSON.parse(cached);
          }
          if (live) {
            setUser(current);
            const saved = await AsyncStorage.getItem(`role:${current.id}`);
            if (saved) {
              const parsed = JSON.parse(saved) as Role;
              if (
                parsed.kind === 'donor' ||
                current.organizations.some((o) => o.id === parsed.organizationId)
              )
                setRoleState(parsed);
            }
          }
        }
      } catch {
        await persistSession(null);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
      onSession(null);
    };
  }, [query]);
  async function refreshUser() {
    const next = await request<UserView>('/auth/me');
    setUser(next);
    await AsyncStorage.setItem('entrega-user-cache', JSON.stringify(next));
  }
  const value: AuthContextValue = {
    user,
    loading,
    role,
    setRole(next) {
      setRoleState(next);
      if (user) void AsyncStorage.setItem(`role:${user.id}`, JSON.stringify(next));
    },
    async signIn(result) {
      query.clear();
      await persistSession(result);
      setRoleState({ kind: 'donor' });
    },
    async logout() {
      const device = await AsyncStorage.getItem('entrega-push-token');
      if (device) await request('/devices', { method: 'DELETE', body: { token: device } });
      await request('/auth/logout', { method: 'POST' });
      await AsyncStorage.removeItem('entrega-push-token');
      await persistSession(null);
    },
    refreshUser,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}
export function useRequiredAuth() {
  const auth = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!auth.loading && !auth.user) router.replace('/login');
  }, [auth.loading, auth.user, router]);
  return auth;
}
