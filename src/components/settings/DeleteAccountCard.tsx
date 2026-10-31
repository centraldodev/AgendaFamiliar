import { useState } from "react";
import { Text, View } from "react-native";
import { auth } from "../../config/firebase";
import { useTheme } from "../../styles/theme";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
// Exclusão de conta (exigência da Play Store). Pede a senha de novo antes.
export function DeleteAccountCard({
  busy,
  onDelete,
}: {
  busy: boolean;
  onDelete: (password?: string) => void;
}) {
  const { s } = useTheme();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const hasPassword = !!auth.currentUser?.providerData.some((p) => p.providerId === "password");
  if (!open)
    return (
      <Button title="Excluir minha conta" variant="ghost" icon="trash-outline" onPress={() => setOpen(true)} />
    );
  return (
    <View style={[s.card, s.error]}>
      <Text style={s.heading}>Excluir conta</Text>
      <Text style={s.muted}>
        Apaga seu perfil, suas tarefas privadas e seus tokens. As tarefas compartilhadas ficam
        com a família, sem o seu nome. Se você é o único membro, o grupo inteiro é apagado. Não
        dá para desfazer.
      </Text>
      {hasPassword ? (
        <Field
          label="Confirme sua senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
        />
      ) : (
        <Text style={s.muted}>
          Por segurança, saia e entre de novo com o Google logo antes de excluir.
        </Text>
      )}
      <View style={s.actionsRow}>
        <Button
          title="Excluir definitivamente"
          variant="danger"
          disabled={busy || (hasPassword && !password)}
          onPress={() => onDelete(hasPassword ? password : undefined)}
        />
        <Button title="Cancelar" variant="ghost" onPress={() => setOpen(false)} />
      </View>
    </View>
  );
}
