import { Pressable, View } from "react-native";
import { useTheme } from "../../styles/theme";
import { Icon } from "../ui/Icon";
export function NewTaskFab({
  disabled,
  onPress,
}: {
  disabled: boolean;
  onPress: () => void;
}) {
  const { s, colors } = useTheme();
  return (
    <View pointerEvents="box-none" style={s.fabContainer}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Criar nova tarefa"
        accessibilityHint="Abre o formulário de criação de tarefa"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          s.fab,
          pressed && s.fabPressed,
          disabled && { opacity: 0.5 },
        ]}
      >
        <Icon name="add" size={32} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}
