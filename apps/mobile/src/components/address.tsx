import { View } from 'react-native';
import { type Control, type FieldValues, type Path } from 'react-hook-form';
import { FormField, styles } from './ui';
export function AddressFields<F extends FieldValues>({ control }: { control: Control<F> }) {
  return (
    <View style={styles.stack}>
      {[
        ['city', 'Cidade'],
        ['state', 'Estado (UF)'],
        ['neighborhood', 'Bairro'],
        ['street', 'Rua'],
        ['number', 'Número'],
        ['complement', 'Complemento (opcional)'],
      ].map(([name, label]) => (
        <FormField
          key={name}
          control={control}
          name={name as Path<F>}
          label={label}
          autoCapitalize={name === 'state' ? 'characters' : 'words'}
          maxLength={name === 'state' ? 2 : undefined}
        />
      ))}
    </View>
  );
}
