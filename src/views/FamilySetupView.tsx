import { Text, View } from "react-native";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import type { AgendaController } from "../controllers/AgendaController";
import { appStyles as s } from "../styles/appStyles";
export function FamilySetupView({
  controller,
}: {
  controller: AgendaController;
}) {
  const { familyName, setFamilyName, code, setCode, join } =
    controller.familySetup;
  const { busy, run } = controller.actions;
  return (
    <View style={s.card}>
      <Text style={s.heading}>Sua família, no mesmo lugar.</Text>
      <Text style={s.muted}>
        Crie um grupo ou use o código que alguém da família compartilhou com
        você.
      </Text>
      <Field
        label="Nome da família"
        placeholder="Ex.: Família Silva"
        value={familyName}
        onChangeText={setFamilyName}
      />
      <Button
        title="Criar grupo familiar"
        disabled={busy || !familyName.trim()}
        onPress={() => void run(() => join("create"))}
      />
      <View style={s.line} />
      <Field
        label="Código de convite"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
      />
      <Button
        title="Entrar na família"
        secondary
        disabled={busy || !code.trim()}
        onPress={() => void run(() => join("join"))}
      />
    </View>
  );
}
