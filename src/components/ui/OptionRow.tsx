import { Pressable, Text } from "react-native";
import { useTheme } from "../../styles/theme";
import { Icon, type IconName } from "./Icon";
export function OptionRow({
  label,
  selected,
  onPress,
  icon,
  accent = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
  /** Selecionado em azul em vez do verde da marca. */
  accent?: boolean;
}) {
  const { s, colors } = useTheme();
  const on = accent ? colors.onAccent : colors.onPrimary;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[s.optionRow, selected && (accent ? s.optionRowSelectedAccent : s.optionRowSelected)]}
      onPress={onPress}
    >
      <Icon
        name={selected ? "radio-button-on" : "radio-button-off"}
        size={22}
        color={selected ? on : colors.iconMuted}
      />
      {icon && <Icon name={icon} size={20} color={selected ? on : colors.icon} />}
      <Text style={[s.inputText, selected && { color: on }]}>{label}</Text>
    </Pressable>
  );
}
