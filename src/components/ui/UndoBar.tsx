import { Pressable, Text, View } from "react-native";
import { useTheme } from "../../styles/theme";
// Aviso no rodapé com "Desfazer" enquanto a ação ainda não foi gravada.
export function UndoBar({ label, onUndo }: { label: string; onUndo: () => void }) {
  const { s } = useTheme();
  return (
    <View style={s.undoContainer} pointerEvents="box-none">
      <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.undoBar}>
        <Text style={s.undoText}>{label}</Text>
        <Pressable accessibilityRole="button" onPress={onUndo} hitSlop={10}>
          <Text style={s.undoAction}>Desfazer</Text>
        </Pressable>
      </View>
    </View>
  );
}
