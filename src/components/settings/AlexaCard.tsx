import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { getAlexaStatus, unlinkAlexa, type AlexaStatus } from "../../services/alexa/alexaStatus";
import { useTheme } from "../../styles/theme";
import { confirmAction } from "../../utils/confirmAction";
import { formatShortDate } from "../../utils/formatShortDate";
import { message } from "../../utils/message";
import { Button } from "../ui/Button";
// A vinculação é feita no app Alexa (skill "Agenda Familiar" › Vincular conta).
// Aqui só mostra se está vinculada e permite desvincular.
export function AlexaCard() {
  const { s } = useTheme();
  const [status, setStatus] = useState<AlexaStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = async () => setStatus(await getAlexaStatus());
  useEffect(() => {
    void load().catch((failure) => setError(message(failure)));
  }, []);
  const unlink = async () => {
    const confirmed = await confirmAction(
      "Desvincular Alexa",
      "A Alexa deixa de acessar sua agenda até você vincular de novo. Continuar?",
      "Desvincular",
    );
    if (!confirmed) return;
    setBusy(true);
    setError("");
    try {
      await unlinkAlexa();
      await load();
    } catch (failure) {
      setError(message(failure));
    } finally {
      setBusy(false);
    }
  };
  const last = status?.links[0]?.lastUsedAt;
  return (
    <View style={s.card}>
      <Text style={s.heading}>Alexa</Text>
      {status === null && !error && <Text style={s.muted}>Carregando…</Text>}
      {status?.linked && (
        <>
          <Text style={s.muted}>
            Sua conta está vinculada à Alexa{last ? ` (último uso em ${formatShortDate(last)})` : ""}. Peça: "Alexa, abrir
            agenda familiar".
          </Text>
          <Button
            title="Desvincular"
            variant="danger"
            size="sm"
            disabled={busy}
            loading={busy}
            onPress={() => void unlink()}
          />
        </>
      )}
      {status && !status.linked && (
        <Text style={s.muted}>
          No app Alexa, procure a skill "Agenda Familiar", toque em Ativar e entre com esta conta. Cada pessoa vincula a
          própria Alexa e só ouve as suas tarefas.
        </Text>
      )}
      {!!error && <Text style={s.errorText}>{error}</Text>}
    </View>
  );
}
