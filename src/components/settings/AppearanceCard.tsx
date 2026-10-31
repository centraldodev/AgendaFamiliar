import { Text, View } from "react-native";
import type { ThemePreference } from "../../services/settings/themePreference";
import { useTheme } from "../../styles/theme";
import type { IconName } from "../ui/Icon";
import { OptionRow } from "../ui/OptionRow";
const options: [ThemePreference, string, IconName][] = [
  ["system", "Igual ao aparelho", "phone-portrait-outline"],
  ["light", "Claro", "sunny-outline"],
  ["dark", "Escuro", "moon-outline"],
];
export function AppearanceCard() {
  const { s, preference, setPreference } = useTheme();
  return (
    <View style={s.card}>
      <Text style={s.heading}>Aparência</Text>
      {options.map(([value, label, icon]) => (
        <OptionRow
          key={value}
          label={label}
          icon={icon}
          accent
          selected={preference === value}
          onPress={() => setPreference(value)}
        />
      ))}
    </View>
  );
}
