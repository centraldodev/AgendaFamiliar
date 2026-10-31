import { Pressable, Text, View } from "react-native";
import { useTheme } from "../../styles/theme";
import { Icon, type IconName } from "./Icon";
// Campo que mostra só a opção escolhida; tocar abre a lista em outro painel.
export function SelectField({
  label,
  value,
  placeholder,
  onPress,
  icon,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  icon?: IconName;
}) {
  const { s, colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || placeholder}`}
        style={[s.input, s.row]}
        onPress={onPress}
      >
        {icon && <Icon name={icon} size={20} />}
        <Text style={[value ? s.inputText : s.placeholderText, { flex: 1 }]}>
          {value || placeholder}
        </Text>
        <Icon name="chevron-forward" size={18} color={colors.placeholder} />
      </Pressable>
    </View>
  );
}
