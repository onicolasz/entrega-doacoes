import { View } from 'react-native';
import { T, colors } from './ui';
export function DateTime({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  const now = new Date();
  const minimum = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  return (
    <View style={{ gap: 8 }}>
      <T variant="label">Data e horário</T>
      <input
        aria-label="Data e horário"
        type="datetime-local"
        value={local}
        min={minimum}
        onChange={(e) => {
          const next = new Date(e.target.value);
          if (!Number.isNaN(next.getTime())) onChange(next.toISOString());
        }}
        style={{
          fontFamily: 'Manrope_400Regular',
          fontSize: 16,
          color: colors.ink,
          padding: 15,
          border: `1px solid ${colors.line}`,
          borderRadius: 14,
          backgroundColor: 'white',
          width: '100%',
          boxSizing: 'border-box',
          minHeight: 52,
        }}
      />
      <T variant="small" muted>
        O horário usa o fuso do seu aparelho.
      </T>
    </View>
  );
}
