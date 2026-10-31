import { Text, View } from "react-native";
import type { AgendaController } from "../controllers/AgendaController";
import { appStyles as s } from "../styles/appStyles";
export function FamilyView({ controller }: { controller: AgendaController }) {
  const { profile, family } = controller.session;
  if (!profile || !family) return null;
  return (
    <View style={s.card}>
      <Text style={s.heading}>{family.name}</Text>
      <Text style={s.muted}>
        Compartilhe este código para sua família entrar no mesmo grupo.
      </Text>
      <Text selectable style={s.code}>
        {family.code}
      </Text>
      <Text style={s.muted}>Conta: {profile.email}</Text>
      <Text style={s.muted}>
        Tarefas compartilhadas aparecem para todos do grupo. Tarefas privadas
        ficam visíveis apenas para quem as criou.
      </Text>
    </View>
  );
}
