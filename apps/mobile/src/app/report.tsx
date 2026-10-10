import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { request, errorText } from '../lib/api';
import { useRequiredAuth } from '../lib/auth';
import { Button, Input, Screen, T, colors } from '../components/ui';
export default function Report() {
  const params = useLocalSearchParams<{ targetType: string; targetId: string }>();
  useRequiredAuth();
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  async function submit() {
    setBusy(true);
    setError('');
    try {
      await request('/reports', { method: 'POST', body: { ...params, reason } });
      setDone(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="Denunciar" back>
      <T variant="title">{done ? 'Recebemos seu relato.' : 'Conte o que aconteceu.'}</T>
      <T muted>
        {done
          ? 'Nossa equipe vai analisar as informações.'
          : 'Seu relato será visto pela equipe de administração.'}
      </T>
      {!done ? (
        <Input
          label="Motivo da denúncia"
          multiline
          value={reason}
          onChangeText={setReason}
          maxLength={2000}
        />
      ) : null}
      {error ? <T style={{ color: colors.danger }}>{error}</T> : null}
      <Button
        busy={busy}
        disabled={!done && !reason.trim()}
        onPress={() => (done ? router.back() : void submit())}
      >
        {done ? 'Voltar' : 'Enviar relato'}
      </Button>
    </Screen>
  );
}
