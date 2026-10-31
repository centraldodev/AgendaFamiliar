import { useEffect, useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import type { ApiToken } from "../../models/ApiToken";
import { createApiToken } from "../../services/apiTokens/createApiToken";
import { listApiTokens } from "../../services/apiTokens/listApiTokens";
import { revokeApiToken } from "../../services/apiTokens/revokeApiToken";
import { useTheme } from "../../styles/theme";
import { confirmAction } from "../../utils/confirmAction";
import { formatShortDate } from "../../utils/formatShortDate";
import { message } from "../../utils/message";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
// Tokens pessoais para integrações (ex.: assistentes, automações) usarem a API.
export function ApiTokensCard() {
  const { s } = useTheme();
  const [tokens, setTokens] = useState<ApiToken[] | null>(null);
  const [name, setName] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = async () => setTokens(await listApiTokens());
  useEffect(() => {
    void load().catch((failure) => setError(message(failure)));
  }, []);
  const act = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (failure) {
      setError(message(failure));
    } finally {
      setBusy(false);
    }
  };
  const create = () =>
    act(async () => {
      const result = await createApiToken(name.trim());
      setCreated(result.token);
      setName("");
      await load();
    });
  const revoke = (token: ApiToken) =>
    act(async () => {
      const confirmed = await confirmAction(
        "Revogar token",
        `O token "${token.name}" deixa de funcionar na hora. Continuar?`,
        "Revogar",
      );
      if (!confirmed) return;
      await revokeApiToken(token.id);
      await load();
    });
  return (
    <View style={s.card}>
      <Text style={s.heading}>Acesso pela API</Text>
      <Text style={s.muted}>
        Tokens pessoais para outros apps e automações lerem e mudarem sua agenda. Quem tiver o
        token age como você; revogue o que não usar mais.
      </Text>
      {!!created && (
        <View style={s.notice}>
          <Text style={s.label}>Copie agora: o token não aparece de novo.</Text>
          <Text selectable style={s.inputText}>
            {created}
          </Text>
          <View style={s.actionsRow}>
            <Button
              title="Compartilhar"
              variant="accentSoft"
              size="sm"
              icon="share-outline"
              onPress={() => void Share.share({ message: created }).catch(() => {})}
            />
            <Button title="Pronto" variant="ghost" size="sm" onPress={() => setCreated(null)} />
          </View>
        </View>
      )}
      {tokens === null && !error && <Text style={s.muted}>Carregando…</Text>}
      {tokens?.map((token) => (
        <View key={token.id} style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.memberName}>{token.name}</Text>
            <Text style={s.footerText}>
              {token.createdAt ? `Criado em ${formatShortDate(token.createdAt)}` : ""}
              {token.lastUsedAt ? ` · Último uso ${formatShortDate(token.lastUsedAt)}` : " · Nunca usado"}
            </Text>
          </View>
          <Pressable disabled={busy} onPress={() => void revoke(token)} hitSlop={8}>
            <Text style={s.dangerLink}>Revogar</Text>
          </Pressable>
        </View>
      ))}
      <Field label="Nome do novo token" value={name} onChangeText={setName} placeholder="Ex.: Assistente de voz" maxLength={60} />
      <Button
        title="Criar token"
        variant="accent"
        disabled={busy || !name.trim()}
        loading={busy}
        onPress={() => void create()}
      />
      {!!error && <Text style={s.errorText}>{error}</Text>}
    </View>
  );
}
