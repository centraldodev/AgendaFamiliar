import { Text, View } from "react-native";
import type { FamilyHistoryEntry } from "../../models/FamilyHistoryEntry";
import { useTheme } from "../../styles/theme";
import { describeHistory } from "../../utils/describeHistory";
import { formatDateTime } from "../../utils/formatDateTime";
export function HistoryCard({ entries }: { entries: FamilyHistoryEntry[] }) {
  const { s } = useTheme();
  return (
    <View style={s.card}>
      <Text style={s.heading}>Histórico do grupo</Text>
      {!entries.length && (
        <Text style={s.muted}>Ainda não há registros.</Text>
      )}
      {entries.map((entry) => (
        <View key={entry.id} style={{ gap: 2 }}>
          <Text style={s.memberName}>{describeHistory(entry)}</Text>
          <Text style={s.muted}>{formatDateTime(entry.at)}</Text>
        </View>
      ))}
    </View>
  );
}
