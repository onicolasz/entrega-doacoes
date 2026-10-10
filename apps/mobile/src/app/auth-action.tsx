import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { passwordSchema } from '@entrega/contracts';
import { request, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Input, Screen, T, colors } from '../components/ui';
export default function AuthAction() {
  const params = useLocalSearchParams<{ purpose: string; token: string }>();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const reset = params.purpose === 'reset';
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  async function submit() {
    setError('');
    if (reset) {
      const valid = passwordSchema.safeParse(password);
      if (!valid.success) {
        setError(valid.error.issues[0].message);
        return;
      }
    }
    setBusy(true);
    try {
      await request('/auth/action', {
        method: 'POST',
        body: { token: params.token, purpose: params.purpose, ...(reset ? { password } : {}) },
      });
      if (user && !reset) await refreshUser();
      setDone(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen back title={reset ? 'Nova senha' : 'Confirmar email'}>
      <T variant="title">
        {done
          ? reset
            ? 'Sua senha foi alterada.'
            : 'Seu email está confirmado.'
          : reset
            ? 'Escolha uma nova senha.'
            : 'Pronto para fazer uma boa conexão?'}
      </T>
      {!done && reset ? (
        <Input
          label="Nova senha"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          helper="Pelo menos 10 caracteres"
        />
      ) : null}
      {error ? <T style={{ color: colors.danger }}>{error}</T> : null}
      {done ? (
        <Button onPress={() => router.replace(user && !reset ? '/profile' : '/login')}>
          Continuar
        </Button>
      ) : (
        <Button busy={busy} onPress={() => void submit()}>
          {reset ? 'Salvar nova senha' : 'Confirmar meu email'}
        </Button>
      )}
    </Screen>
  );
}
