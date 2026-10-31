import { Text, View } from "react-native";
import { useTheme } from "../../styles/theme";
import { OptionRow } from "../ui/OptionRow";
// Mesmos valores aceitos pelo firestore.rules e pelo agendador (dueReminder.ts).
const options: [number, string][] = [
  [0, "No horário da tarefa"],
  [15, "15 minutos antes"],
  [30, "30 minutos antes"],
  [60, "1 hora antes"],
  [120, "2 horas antes"],
  [1440, "1 dia antes"],
  [-1, "Não avisar"],
];
export function ReminderCard({
  value,
  busy,
  onChange,
}: {
  value: number;
  busy: boolean;
  onChange: (minutes: number) => void;
}) {
  const { s } = useTheme();
  return (
    <View style={s.card}>
      <Text style={s.heading}>Lembretes</Text>
      <Text style={s.muted}>
        Quando avisar das tarefas que vencem. Sem horário, a tarefa conta como 08:00. Vale para
        todos os seus aparelhos.
      </Text>
      {options.map(([minutes, label]) => (
        <OptionRow
          key={minutes}
          label={label}
          icon={minutes < 0 ? "notifications-off-outline" : "alarm-outline"}
          selected={value === minutes}
          accent
          onPress={() => !busy && onChange(minutes)}
        />
      ))}
    </View>
  );
}
