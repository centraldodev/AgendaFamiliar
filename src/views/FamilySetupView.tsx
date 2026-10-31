import { Text, View } from "react-native";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import type { AgendaController } from "../controllers/AgendaController";
import { useTheme } from "../styles/theme";
export function FamilySetupView({
  controller,
}: {
  controller: AgendaController;
}) {
  const { s } = useTheme();
  const { familyName, setFamilyName, code, setCode, join, myRequest, cancel, check } =
    controller.familySetup;
  const { busy, run } = controller.actions;
  if (myRequest)
    return (
      <View style={s.card}>
        <Text style={s.heading}>Aguardando aprovação</Text>
        <Text style={s.muted}>
          Você pediu para entrar em {myRequest.familyName}. Um administrador do
          grupo precisa aceitar o pedido; você será avisado e a tela atualiza
          sozinha.
        </Text>
        <Button
          title="Verificar agora"
          disabled={busy}
          onPress={() => void run(check)}
        />
        <Button
          title="Cancelar solicitação"
          variant="secondary"
          disabled={busy}
          onPress={() => void run(cancel)}
        />
      </View>
    );
  return (
    <View style={s.card}>
      <Text style={s.heading}>Sua família, no mesmo lugar.</Text>
      <Text style={s.muted}>
        Crie um grupo ou use o código que alguém da família compartilhou com
        você. Quem entra por código precisa ser aprovado por um administrador.
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
        title="Pedir entrada na família"
        variant="secondary"
        disabled={busy || !code.trim()}
        onPress={() => void run(() => join("join"))}
      />
    </View>
  );
}
