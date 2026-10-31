import { Share, Text, View } from "react-native";
import type { Family } from "../../models/Family";
import { useTheme } from "../../styles/theme";
import { Button } from "../ui/Button";
export function FamilyCodeCard({ family }: { family: Family }) {
  const { s } = useTheme();
  const share = () =>
    void Share.share({
      message: `Entre no grupo "${family.name}" no Agenda Familiar com o código ${family.code}.`,
    }).catch(() => {});
  return (
    <View style={s.card}>
      <Text style={s.heading}>{family.name}</Text>
      <Text style={s.muted}>
        Compartilhe este código para alguém pedir entrada no grupo. Um
        administrador precisa aprovar cada pedido.
      </Text>
      <Text selectable style={s.code}>
        {family.code}
      </Text>
      <Button title="Compartilhar código" variant="accentSoft" onPress={share} />
    </View>
  );
}
