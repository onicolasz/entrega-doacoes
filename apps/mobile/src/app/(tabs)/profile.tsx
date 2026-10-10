import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { request } from '../../lib/api';
import { enableNotifications } from '../../lib/notifications';
import {
  Badge,
  Button,
  Icon,
  Screen,
  State,
  T,
  askConfirm,
  colors,
  showError,
  styles,
} from '../../components/ui';
export default function Profile() {
  const router = useRouter();
  const { user, role, setRole, loading, logout, refreshUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  async function resend() {
    setBusy(true);
    try {
      await request('/auth/resend', { method: 'POST' });
      setSent(true);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }
  async function exit() {
    setBusy(true);
    try {
      await logout();
      router.replace('/');
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <Screen title="Perfil">
        <State loading />
      </Screen>
    );
  if (!user)
    return (
      <Screen title="Seu perfil">
        <View style={{ alignItems: 'center', gap: 16, padding: 24 }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 30,
              backgroundColor: colors.mint,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="heart-outline" size={40} />
          </View>
          <T variant="title" style={{ textAlign: 'center' }}>
            Faça parte dessa conexão.
          </T>
          <T muted style={{ textAlign: 'center' }}>
            Doe o que você não usa ou represente uma instituição da sua comunidade.
          </T>
        </View>
        <Button onPress={() => router.push('/login')}>Entrar ou criar conta</Button>
      </Screen>
    );
  return (
    <Screen title="Perfil">
      <View style={styles.row}>
        <View
          style={{
            width: 68,
            height: 68,
            borderRadius: 24,
            backgroundColor: colors.mint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <T variant="title" style={{ color: colors.green }}>
            {user.name.slice(0, 1).toUpperCase()}
          </T>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <T variant="subtitle">{user.name}</T>
          <T variant="small" muted>
            {user.email}
          </T>
        </View>
      </View>
      {!user.verified ? (
        <View style={[styles.card, { gap: 12 }]}>
          <T variant="label">Confirme seu email</T>
          <T muted>
            {sent
              ? 'Enviamos um novo link. Confira sua caixa de entrada.'
              : 'Abra o link que enviamos para liberar suas doações e solicitações.'}
          </T>
          <Button secondary busy={busy} onPress={() => void resend()}>
            Reenviar link
          </Button>
          <Button secondary onPress={() => void refreshUser().catch(showError)}>
            Já confirmei meu email
          </Button>
        </View>
      ) : (
        <View style={styles.row}>
          <Icon name="checkmark-circle" size={18} />
          <T variant="small" muted>
            Email confirmado
          </T>
        </View>
      )}
      <T variant="subtitle">Como você está usando o app</T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Usar como doador"
        onPress={() => setRole({ kind: 'donor' })}
        style={[
          styles.card,
          { borderColor: role.kind === 'donor' ? colors.green : colors.line },
          styles.row,
        ]}
      >
        <Icon name="heart-outline" />
        <View style={{ flex: 1 }}>
          <T variant="label">Pessoa doadora</T>
          <T variant="small" muted>
            Cadastre itens e escolha um destino.
          </T>
        </View>
        {role.kind === 'donor' ? <Icon name="checkmark-circle" /> : null}
      </Pressable>
      {user.organizations.map((o) => (
        <View
          key={o.id}
          style={[
            styles.card,
            { gap: 12, borderColor: role.organizationId === o.id ? colors.green : colors.line },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Representar ${o.name}`}
            onPress={() => setRole({ kind: 'organization', organizationId: o.id })}
            style={styles.row}
          >
            <Icon name="business-outline" />
            <View style={{ flex: 1, gap: 5 }}>
              <T variant="label">{o.name}</T>
              <Badge status={o.status} />
            </View>
            {role.organizationId === o.id ? <Icon name="checkmark-circle" /> : null}
          </Pressable>
          {o.reviewNote ? <T muted>{o.reviewNote}</T> : null}
          <Button secondary onPress={() => router.push(`/organization-form?id=${o.id}`)}>
            Editar cadastro
          </Button>
        </View>
      ))}
      <Button secondary icon="add" onPress={() => router.push('/organization-form')}>
        Cadastrar instituição
      </Button>
      <View style={styles.line} />
      <Button
        secondary
        icon="notifications-outline"
        onPress={() => void enableNotifications().catch(showError)}
      >
        Ativar notificações
      </Button>
      <Button secondary onPress={() => router.push('/notices')}>
        Ver novidades
      </Button>
      {user.admin ? (
        <Button secondary icon="shield-checkmark-outline" onPress={() => router.push('/admin')}>
          Administração
        </Button>
      ) : null}
      <Button
        secondary
        danger
        busy={busy}
        onPress={() =>
          askConfirm(
            'Sair da conta',
            'Você pode entrar novamente quando quiser.',
            () => void exit(),
          )
        }
      >
        Sair da conta
      </Button>
    </Screen>
  );
}
