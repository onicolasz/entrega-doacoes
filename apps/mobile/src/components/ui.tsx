import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextProps,
  type TextInputProps,
  type ImageStyle,
  type StyleProp,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import type { ReactNode, ComponentProps } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Image } from 'expo-image';
import {
  type DonationView,
  type OrganizationView,
  categoryLabels,
  statusLabels,
} from '@entrega/contracts';
export const colors = {
  bg: '#F7F9F8',
  surface: '#FFFFFF',
  ink: '#172F2B',
  muted: '#687A75',
  green: '#006B5E',
  mint: '#E2F2E9',
  line: '#E2E9E5',
  warning: '#8C5B12',
  danger: '#AD3D40',
};
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  stack: { gap: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 20,
  },
  line: { height: 1, backgroundColor: colors.line },
  input: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 16,
    color: colors.ink,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.surface,
    minHeight: 52,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  content: {
    padding: 24,
    gap: 24,
    paddingBottom: 36,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  photo: { width: '100%', height: 210, borderRadius: 18, backgroundColor: colors.mint },
});
export function T({
  variant = 'body',
  muted = false,
  style,
  ...props
}: TextProps & {
  variant?: 'hero' | 'title' | 'subtitle' | 'body' | 'small' | 'label';
  muted?: boolean;
}) {
  const sizes = {
    hero: [32, 40],
    title: [25, 33],
    subtitle: [19, 27],
    body: [15, 23],
    small: [12, 19],
    label: [14, 20],
  };
  const [fontSize, lineHeight] = sizes[variant];
  return (
    <Text
      {...props}
      style={[
        {
          fontFamily: ['hero', 'title', 'subtitle', 'label'].includes(variant)
            ? 'Manrope_700Bold'
            : 'Manrope_400Regular',
          fontSize,
          lineHeight,
          color: muted ? colors.muted : colors.ink,
        },
        style,
      ]}
    />
  );
}
export type IconName = ComponentProps<typeof Ionicons>['name'];
export function Icon({
  name,
  size = 22,
  color = colors.green,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Ionicons accessible={false} aria-hidden name={name} size={size} color={color} />;
}
export function Button({
  children,
  onPress,
  secondary = false,
  danger = false,
  busy = false,
  disabled = false,
  icon,
}: {
  children: string;
  onPress: () => void;
  secondary?: boolean;
  danger?: boolean;
  busy?: boolean;
  disabled?: boolean;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityState={{ disabled: disabled || busy, busy }}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => ({
        minHeight: 52,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: secondary ? colors.surface : danger ? colors.danger : colors.green,
        borderWidth: secondary ? 1 : 0,
        borderColor: colors.line,
        opacity: disabled || busy ? 0.6 : pressed ? 0.8 : 1,
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? colors.green : 'white'} />
      ) : icon ? (
        <Icon name={icon} color={secondary ? colors.green : 'white'} />
      ) : null}
      <T
        variant="label"
        style={{ color: secondary ? (danger ? colors.danger : colors.green) : 'white' }}
      >
        {children}
      </T>
    </Pressable>
  );
}
export function Screen({
  children,
  title,
  back = false,
  action,
  scroll = true,
}: {
  children: ReactNode;
  title?: string;
  back?: boolean;
  action?: ReactNode;
  scroll?: boolean;
}) {
  const router = useRouter();
  const tabs = useSegments()[0] === '(tabs)';
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={tabs ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom']}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {title ? (
          <View
            style={{
              paddingHorizontal: 24,
              paddingTop: 12,
              paddingBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              maxWidth: 560,
              alignSelf: 'center',
            }}
          >
            {back ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Voltar"
                hitSlop={12}
                style={{ padding: 6 }}
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              >
                <Icon name="arrow-back" />
              </Pressable>
            ) : null}
            <T variant="subtitle" style={{ flex: 1 }}>
              {title}
            </T>
            {action}
          </View>
        ) : null}
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
            automaticallyAdjustKeyboardInsets={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, { flex: 1, paddingBottom: 12 }]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Chip({
  label,
  selected = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        selected && { backgroundColor: colors.green, borderColor: colors.green },
      ]}
    >
      <T
        variant="small"
        style={{ color: selected ? 'white' : colors.ink, fontFamily: 'Manrope_600SemiBold' }}
      >
        {label}
      </T>
    </Pressable>
  );
}
export function Badge({ status }: { status: string }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: ['REJECTED', 'CANCELLED', 'DECLINED'].includes(status)
          ? '#FBE9E9'
          : colors.mint,
      }}
    >
      <T
        variant="small"
        style={{
          color: ['REJECTED', 'CANCELLED', 'DECLINED'].includes(status)
            ? colors.danger
            : colors.green,
          fontFamily: 'Manrope_600SemiBold',
        }}
      >
        {statusLabels[status] || status}
      </T>
    </View>
  );
}
export function Input({
  label,
  error,
  helper,
  style,
  ...props
}: TextInputProps & { label?: string; error?: string; helper?: string }) {
  return (
    <View style={{ gap: 7 }}>
      {label ? <T variant="label">{label}</T> : null}
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel || label}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          props.multiline && { height: 110, textAlignVertical: 'top' },
          error && { borderColor: colors.danger },
          style,
        ]}
      />
      {error ? (
        <T variant="small" style={{ color: colors.danger }}>
          {error}
        </T>
      ) : helper ? (
        <T variant="small" muted>
          {helper}
        </T>
      ) : null}
    </View>
  );
}
export function FormField<F extends FieldValues>({
  control,
  name,
  numeric = false,
  ...props
}: { control: Control<F>; name: Path<F>; numeric?: boolean } & Omit<
  ComponentProps<typeof Input>,
  'value' | 'onChangeText' | 'error'
>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Input
          {...props}
          value={String(field.value ?? '')}
          onBlur={field.onBlur}
          onChangeText={(v) => field.onChange(numeric ? (v === '' ? 0 : Number(v)) : v)}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
export function State({
  loading = false,
  error,
  empty,
  onRetry,
}: {
  loading?: boolean;
  error?: unknown;
  empty?: string;
  onRetry?: () => void;
}) {
  if (loading)
    return (
      <View style={{ padding: 40, alignItems: 'center', gap: 12 }}>
        <ActivityIndicator size="large" color={colors.green} />
        <T muted>Carregando…</T>
      </View>
    );
  if (error)
    return (
      <View style={styles.card}>
        <T variant="subtitle">Não conseguimos carregar</T>
        <T muted style={{ marginVertical: 12 }}>
          {error instanceof Error ? error.message : 'Verifique sua conexão e tente novamente.'}
        </T>
        {onRetry ? (
          <Button secondary onPress={onRetry}>
            Tentar novamente
          </Button>
        ) : null}
      </View>
    );
  if (empty)
    return (
      <View style={[styles.card, { alignItems: 'center', padding: 32, gap: 12 }]}>
        <Icon name="leaf-outline" size={32} />
        <T muted style={{ textAlign: 'center' }}>
          {empty}
        </T>
      </View>
    );
  return null;
}
export function Photo({
  uri,
  label,
  style,
}: {
  uri?: string;
  label: string;
  style?: StyleProp<ImageStyle>;
}) {
  return uri ? (
    <Image
      source={uri}
      accessibilityLabel={label}
      contentFit="cover"
      style={[styles.photo, style]}
      transition={150}
    />
  ) : (
    <View style={[styles.photo, { alignItems: 'center', justifyContent: 'center' }, style]}>
      <Icon name="images-outline" size={36} />
    </View>
  );
}
export function DonationCard({ item, onPress }: { item: DonationView; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${categoryLabels[item.category]}`}
      style={{
        backgroundColor: colors.surface,
        borderRadius: 22,
        borderColor: colors.line,
        borderWidth: 1,
        overflow: 'hidden',
      }}
    >
      <Photo uri={item.photos[0]} label={item.title} style={{ borderRadius: 0, height: 190 }} />
      <View style={{ padding: 18, gap: 10 }}>
        <View style={styles.between}>
          <T variant="small" muted>
            {categoryLabels[item.category]}
          </T>
          <Badge status={item.status} />
        </View>
        <T variant="subtitle">{item.title}</T>
        <View style={styles.row}>
          <Icon name="location-outline" size={16} />
          <T variant="small" muted>
            {item.neighborhood}, {item.city}
            {item.distanceKm !== undefined ? ` · ${item.distanceKm} km` : ''}
          </T>
        </View>
      </View>
    </Pressable>
  );
}
export function OrganizationCard({
  item,
  onPress,
}: {
  item: OrganizationView;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver ${item.name}`}
      style={[styles.card, { padding: 0, overflow: 'hidden' }]}
    >
      <Photo uri={item.photos[0]} label={item.name} style={{ borderRadius: 0, height: 170 }} />
      <View style={{ padding: 18, gap: 10 }}>
        <View style={styles.row}>
          <T variant="subtitle" style={{ flex: 1 }}>
            {item.name}
          </T>
          <Icon name="checkmark-circle" size={20} />
        </View>
        <T variant="small" muted>
          {item.neighborhood}, {item.city}
          {item.distanceKm !== undefined ? ` · ${item.distanceKm} km` : ''}
        </T>
        <T numberOfLines={2}>{item.needs}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {item.categories.slice(0, 3).map((c) => (
            <View
              key={c}
              style={{
                paddingHorizontal: 9,
                paddingVertical: 4,
                borderRadius: 7,
                backgroundColor: colors.mint,
              }}
            >
              <T variant="small" style={{ color: colors.green }}>
                {categoryLabels[c]}
              </T>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}
export function askConfirm(title: string, body: string, action: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${body}`)) action();
  } else
    Alert.alert(title, body, [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Confirmar', onPress: action },
    ]);
}
export function showError(error: unknown) {
  if (Platform.OS === 'web')
    window.alert(error instanceof Error ? error.message : 'Não foi possível continuar');
  else
    Alert.alert(
      'Não foi possível continuar',
      error instanceof Error ? error.message : 'Tente novamente.',
    );
}
