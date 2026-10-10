import { Platform, View } from 'react-native';
import Picker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Button, T, styles } from './ui';
export function DateTime({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const date = new Date(value);
  function changed(event: DateTimePickerEvent, next?: Date) {
    if (event.type === 'set' && next) onChange(next.toISOString());
  }
  return (
    <View style={styles.stack}>
      <T variant="label">Data e horário</T>
      {Platform.OS === 'ios' ? (
        <Picker
          value={date}
          mode="datetime"
          display="compact"
          minimumDate={new Date()}
          onChange={changed}
        />
      ) : (
        <>
          <Button
            secondary
            icon="calendar-outline"
            onPress={() =>
              DateTimePickerAndroid.open({
                value: date,
                mode: 'date',
                minimumDate: new Date(),
                onChange: changed,
              })
            }
          >
            {date.toLocaleDateString('pt-BR', { dateStyle: 'long' })}
          </Button>
          <Button
            secondary
            icon="time-outline"
            onPress={() =>
              DateTimePickerAndroid.open({
                value: date,
                mode: 'time',
                is24Hour: true,
                onChange: changed,
              })
            }
          >
            {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </Button>
        </>
      )}
      <T variant="small" muted>
        O horário usa o fuso do seu aparelho.
      </T>
    </View>
  );
}
