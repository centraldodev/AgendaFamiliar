import { Text, View } from "react-native";
import type { MyJoinRequest } from "../../models/JoinRequest";
import { useTheme } from "../../styles/theme";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
export function JoinFamilyCard({
  hasFamily,
  code,
  onCodeChange,
  request,
  busy,
  onSubmit,
  onCancel,
}: {
  hasFamily: boolean;
  code: string;
  onCodeChange: (code: string) => void;
  request: MyJoinRequest | null;
  busy: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const { s } = useTheme();
  return (
    <View style={s.card}>
      <Text style={s.heading}>
        {hasFamily ? "Trocar de grupo" : "Entrar em um grupo"}
      </Text>
      <Text style={s.muted}>
        {hasFamily
          ? "Você só pode estar em um grupo. Ao pedir entrada em outro, você continua neste até um administrador do novo grupo aprovar; então a troca é feita."
          : "Use o código de convite que um administrador compartilhou."}
      </Text>
      {request ? (
        <>
          <Text style={s.notice}>
            Aguardando aprovação para entrar em {request.familyName}.
          </Text>
          <Button
            title="Cancelar solicitação"
            variant="secondary"
            disabled={busy}
            onPress={onCancel}
          />
        </>
      ) : (
        <>
          <Field
            label="Código de convite"
            value={code}
            onChangeText={onCodeChange}
            autoCapitalize="characters"
            maxLength={12}
          />
          <Button
            title={hasFamily ? "Pedir para trocar de grupo" : "Pedir entrada"}
            variant="accent"
            disabled={busy || !code.trim()}
            onPress={onSubmit}
          />
        </>
      )}
    </View>
  );
}
