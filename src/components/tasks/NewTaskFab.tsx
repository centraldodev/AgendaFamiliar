import { Pressable, Text, View } from "react-native";
import { appStyles as s } from "../../styles/appStyles";
export function NewTaskFab({
  disabled,
  onPress,
}: {
  disabled: boolean;
  onPress: () => void;
}) {
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
        <Text accessible={false} style={s.fabIcon}>
          +
        </Text>
      </Pressable>
    </View>
  );
}
