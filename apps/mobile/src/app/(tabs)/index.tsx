import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import {
  categories,
  categoryLabels,
  type Category,
  type DonationView,
  type OrganizationView,
} from '@entrega/contracts';
import { request } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { currentLocation, searchParams, useDebounced } from '../../lib/hooks';
import {
  Button,
  Chip,
  DonationCard,
  Icon,
  Input,
  OrganizationCard,
  Screen,
  State,
  T,
  colors,
  showError,
  styles,
} from '../../components/ui';
export default function Discover() {
  const router = useRouter();
  const { user, role } = useAuth();
  const ngo = role.kind === 'organization';
  const [q, setQ] = useState('');
  const [city, setCity] = useState('Porto Alegre');
  const [category, setCategory] = useState<Category>();
  const [location, setLocation] = useState<{ latitude: number; longitude: number }>();
  const [locating, setLocating] = useState(false);
  const [editingCity, setEditingCity] = useState(false);
  const filters = { q: useDebounced(q), city: useDebounced(city), category, ...location };
  const organizations = useQuery({
    queryKey: ['organizations', filters],
    queryFn: () => request<OrganizationView[]>(`/organizations?${searchParams(filters)}`),
    enabled: !ngo,
  });
  const donations = useQuery({
    queryKey: ['discover-donations', filters],
    queryFn: () => request<DonationView[]>(`/donations?${searchParams(filters)}`),
    enabled: ngo,
  });
  const result = ngo ? donations : organizations;
  async function nearby() {
    setLocating(true);
    try {
      const coords = await currentLocation();
      if (coords) setLocation({ latitude: coords.latitude, longitude: coords.longitude });
    } catch (error) {
      showError(error);
    } finally {
      setLocating(false);
    }
  }
  return (
    <Screen>
      <View style={styles.between}>
        <View style={styles.row}>
          <View
            style={{
              width: 39,
              height: 39,
              borderRadius: 13,
              backgroundColor: colors.green,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="heart" color="white" size={21} />
          </View>
          <T variant="subtitle">Entrega</T>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver notificações"
          hitSlop={12}
          onPress={() => router.push(user ? '/notices' : '/login')}
        >
          <Icon name="notifications-outline" color={colors.ink} />
        </Pressable>
      </View>
      <Animated.View
        entering={FadeIn.duration(250).reduceMotion(ReduceMotion.System)}
        style={{ gap: 12, paddingVertical: 8 }}
      >
        <T variant="small" muted>
          {user ? `Olá, ${user.name.split(' ')[0]}` : 'Que bom ter você aqui'}
        </T>
        <T variant="hero">
          {ngo ? 'Boas doações,\nperto de você.' : 'Um novo destino\npara o que você tem.'}
        </T>
        <T muted>
          {ngo
            ? 'Encontre doações, converse com quem doa e combine a retirada.'
            : 'Encontre uma instituição e combine a entrega.'}
        </T>
        {!ngo ? (
          <Button icon="add" onPress={() => router.push(user ? '/donate' : '/login')}>
            Quero doar
          </Button>
        ) : null}
      </Animated.View>
      {user && !user.verified ? (
        <Pressable
          onPress={() => router.push('/profile')}
          style={[styles.card, { backgroundColor: colors.mint, borderWidth: 0 }]}
        >
          <T variant="label">Confirme seu email para começar a doar</T>
          <T variant="small" muted>
            Enviamos um link para {user.email}.
          </T>
        </Pressable>
      ) : null}
      <View style={styles.stack}>
        <View style={styles.between}>
          <T variant="subtitle">{ngo ? 'Doações disponíveis' : 'Instituições perto de você'}</T>
          <Icon name="leaf-outline" />
        </View>
        <Input
          placeholder={ngo ? 'Buscar um item' : 'Buscar instituição ou necessidade'}
          accessibilityLabel="Buscar"
          value={q}
          onChangeText={setQ}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Selecionar cidade"
            onPress={() => setEditingCity(!editingCity)}
            style={[styles.row, { flex: 1, minHeight: 44 }]}
          >
            <Icon name="location-outline" size={17} />
            <T variant="small">{city || 'Todas as cidades'}</T>
            <Icon name="chevron-down" size={15} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ordenar por distância"
            disabled={locating}
            onPress={() => void nearby()}
            style={{ padding: 12 }}
          >
            <Icon name={location ? 'navigate' : 'navigate-outline'} />
          </Pressable>
        </View>
        {editingCity ? (
          <>
            <Input label="Cidade" value={city} onChangeText={setCity} />
            <Button secondary onPress={() => setEditingCity(false)}>
              Aplicar cidade
            </Button>
          </>
        ) : null}
        {locating ? (
          <T variant="small" muted>
            Buscando sua localização…
          </T>
        ) : location ? (
          <T variant="small" muted>
            Ordenando por distância na cidade selecionada.
          </T>
        ) : null}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          <Chip label="Tudo" selected={!category} onPress={() => setCategory(undefined)} />
          {categories.map((c) => (
            <Chip
              key={c}
              label={categoryLabels[c]}
              selected={category === c}
              onPress={() => setCategory(c === category ? undefined : c)}
            />
          ))}
        </ScrollView>
      </View>
      <State
        loading={result.isPending}
        error={result.error}
        onRetry={() => void result.refetch()}
        empty={
          !result.isPending && !result.error && !result.data?.length
            ? 'Ainda não há resultados por aqui. Experimente outra categoria ou cidade.'
            : undefined
        }
      />
      {ngo
        ? donations.data?.map((d) => (
            <DonationCard key={d.id} item={d} onPress={() => router.push(`/donation/${d.id}`)} />
          ))
        : organizations.data?.map((o) => (
            <OrganizationCard
              key={o.id}
              item={o}
              onPress={() => router.push(`/organization/${o.id}`)}
            />
          ))}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 20,
          backgroundColor: colors.mint,
          borderRadius: 18,
        }}
      >
        <Icon name="shield-checkmark-outline" size={28} />
        <View style={{ flex: 1, gap: 4 }}>
          <T variant="label">Uma conexão de confiança</T>
          <T variant="small" muted>
            As instituições são analisadas antes de receber doações.
          </T>
        </View>
      </View>
    </Screen>
  );
}
