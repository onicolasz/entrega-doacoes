import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { type InterestView, type MessageView } from '@entrega/contracts';
import { request, errorText } from '../../lib/api';
import { useRequiredAuth } from '../../lib/auth';
import { Button, Icon, Screen, State, T, colors, styles } from '../../components/ui';
export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useRequiredAuth();
  const router = useRouter();
  const client = useQueryClient();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [older, setOlder] = useState<MessageView[]>([]);
  const [hasOlder, setHasOlder] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const attempt = useRef<{ body: string; clientId: string } | null>(null);
  const list = useRef<FlatList<MessageView>>(null);
  const bottom = useRef(true);
  const connection = useQuery({
    queryKey: ['interest', id],
    queryFn: () => request<InterestView>(`/interests/${id}`),
    enabled: !!user,
    refetchInterval: 10000,
  });
  const messages = useQuery({
    queryKey: ['messages', id],
    queryFn: () => request<MessageView[]>(`/conversations/${id}/messages`),
    enabled: !!user,
    refetchInterval: 4000,
  });
  const data = useMemo(
    () =>
      Array.from(new Map([...older, ...(messages.data || [])].map((m) => [m.id, m])).values()).sort(
        (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
      ),
    [older, messages.data],
  );
  const closed =
    connection.data &&
    (!['PENDING', 'ACCEPTED'].includes(connection.data.status) ||
      connection.data.match?.status === 'RECEIVED');
  async function send() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setError('');
    if (attempt.current?.body !== text) attempt.current = { body: text, clientId: randomUUID() };
    try {
      const next = await request<MessageView[]>(`/conversations/${id}/messages`, {
        method: 'POST',
        body: attempt.current,
      });
      client.setQueryData(['messages', id], next);
      setBody('');
      attempt.current = null;
      bottom.current = true;
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  async function previous() {
    if (!data[0]) return;
    setLoadingOlder(true);
    try {
      const more = await request<MessageView[]>(
        `/conversations/${id}/messages?before=${data[0].id}`,
      );
      setOlder((prev) => [...more, ...prev]);
      if (more.length < 50) setHasOlder(false);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoadingOlder(false);
    }
  }
  return (
    <Screen
      title={connection.data?.donation.title || 'Conversa'}
      back
      scroll={false}
      action={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Acompanhar conexão"
          hitSlop={12}
          onPress={() => router.push(`/connection/${id}`)}
        >
          <Icon name="information-circle-outline" />
        </Pressable>
      }
    >
      <State
        loading={messages.isPending}
        error={messages.error || connection.error}
        onRetry={() => {
          void messages.refetch();
          void connection.refetch();
        }}
      />
      <FlatList
        ref={list}
        data={data}
        keyExtractor={(m) => m.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 12, paddingVertical: 12 }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          if (bottom.current) list.current?.scrollToEnd({ animated: false });
        }}
        onScroll={(e) => {
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          bottom.current = layoutMeasurement.height + contentOffset.y >= contentSize.height - 80;
        }}
        ListHeaderComponent={
          data.length >= 50 && hasOlder ? (
            <Button secondary busy={loadingOlder} onPress={() => void previous()}>
              Carregar mensagens anteriores
            </Button>
          ) : null
        }
        ListEmptyComponent={
          !messages.isPending && !messages.error ? (
            <T muted style={{ textAlign: 'center', padding: 24 }}>
              Comece com um oi. Vocês podem combinar os detalhes por aqui.
            </T>
          ) : null
        }
        renderItem={({ item: m }) => (
          <View
            style={{
              maxWidth: '88%',
              alignSelf: m.senderId === user?.id ? 'flex-end' : 'flex-start',
              padding: 14,
              borderRadius: 18,
              borderBottomRightRadius: m.senderId === user?.id ? 5 : 18,
              borderBottomLeftRadius: m.senderId === user?.id ? 18 : 5,
              backgroundColor: m.senderId === user?.id ? colors.mint : colors.surface,
              borderWidth: 1,
              borderColor: colors.line,
              gap: 5,
            }}
          >
            <T variant="small" style={{ fontFamily: 'Manrope_700Bold', color: colors.green }}>
              {m.senderId === user?.id ? 'Você' : m.senderName}
            </T>
            <T selectable>{m.body}</T>
            <T variant="small" muted style={{ textAlign: 'right' }}>
              {new Date(m.createdAt).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </T>
          </View>
        )}
      />
      {error ? (
        <T variant="small" style={{ color: colors.danger }}>
          {error}
        </T>
      ) : null}
      {closed ? (
        <T variant="small" muted style={{ textAlign: 'center' }}>
          Esta conversa foi encerrada. O histórico continua disponível.
        </T>
      ) : (
        <View style={[styles.row, { paddingBottom: 8 }]}>
          <TextInput
            accessibilityLabel="Mensagem"
            multiline
            maxLength={2000}
            placeholder="Escreva sua mensagem…"
            placeholderTextColor={colors.muted}
            value={body}
            onChangeText={setBody}
            style={[styles.input, { flex: 1, maxHeight: 120 }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enviar mensagem"
            disabled={!body.trim() || busy}
            onPress={() => void send()}
            style={{
              width: 50,
              height: 50,
              borderRadius: 16,
              backgroundColor: colors.green,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: !body.trim() || busy ? 0.5 : 1,
            }}
          >
            <Icon name="arrow-up" color="white" />
          </Pressable>
        </View>
      )}
    </Screen>
  );
}
