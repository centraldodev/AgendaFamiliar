import { Pressable, Text, View } from "react-native";
import { appStyles as s } from "../../styles/appStyles";
export function AppHeader({
  signedIn,
  onLogout,
}: {
  signedIn: boolean;
  onLogout: () => void;
}) {
  return (
    <View style={s.header}>
      <View>
        <Text style={s.eyebrow}>UM DIA DE CADA VEZ</Text>
        <Text style={s.brand}>Agenda Familiar</Text>
      </View>
      {signedIn && (
        <Pressable accessibilityRole="button" onPress={onLogout}>
          <Text style={s.link}>Sair</Text>
        </Pressable>
      )}
    </View>
  );
}
