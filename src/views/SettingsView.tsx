import { Pressable, Text, View } from "react-native";
import { AppearanceCard } from "../components/settings/AppearanceCard";
import { FamilyCodeCard } from "../components/settings/FamilyCodeCard";
import { HistoryCard } from "../components/settings/HistoryCard";
import { JoinFamilyCard } from "../components/settings/JoinFamilyCard";
import { JoinRequestsCard } from "../components/settings/JoinRequestsCard";
import { Button } from "../components/ui/Button";
import { MembersCard } from "../components/settings/MembersCard";
import type { AgendaController } from "../controllers/AgendaController";
import { isAdmin } from "../middlewares/isAdmin";
import { logout } from "../services/auth/logout";
import { Icon } from "../components/ui/Icon";
import { useTheme } from "../styles/theme";
import { confirmAction } from "../utils/confirmAction";
const pushMessages = {
  unknown: "Verificando notificações…",
  enabled: "Notificações ativadas neste aparelho.",
  denied:
    "Notificações bloqueadas. Ative-as nas configurações do aparelho para receber pedidos de entrada.",
  unavailable:
    "Notificações indisponíveis neste ambiente (exigem um aparelho real e o app instalado, não o Expo Go no Android).",
} as const;
export function SettingsView({ controller }: { controller: AgendaController }) {
  const { s, colors } = useTheme();
  const { profile, family } = controller.session;
  const { familyManagement: manage, notifications, setTab } = controller;
  const { busy, run } = controller.actions;
  if (!profile || !family) return null;
  const admin = isAdmin(profile);
  const overview = manage.overview;
  return (
    <>
      <View style={s.row}>
        <Text style={s.heading}>Configurações</Text>
        <Pressable onPress={() => setTab("tasks")} style={s.inlineAction}>
          <Icon name="chevron-back" size={18} color={colors.accent} />
          <Text style={s.accentLink}>Voltar</Text>
        </Pressable>
      </View>
      <FamilyCodeCard family={family} />
      {admin && (
        <JoinRequestsCard
          requests={overview?.pending ?? []}
          busy={busy}
          onApprove={(id, role) => void run(() => manage.approve(id, role))}
          onReject={(id) => void run(() => manage.reject(id))}
        />
      )}
      {!overview && manage.loading ? (
        <Text style={s.muted}>Carregando membros…</Text>
      ) : (
        <MembersCard
          members={overview?.members ?? []}
          currentUid={profile.uid}
          isAdmin={admin}
          busy={busy}
          onSetRole={(member, role) =>
            void run(() => manage.setRole(member.uid, role))
          }
          onRemove={(member) =>
            void run(async () => {
              const confirmed = await confirmAction(
                "Remover membro",
                `Remover ${member.displayName || member.email} do grupo?`,
              );
              if (confirmed) await manage.remove(member.uid);
            })
          }
        />
      )}
      <JoinFamilyCard
        hasFamily
        code={manage.code}
        onCodeChange={manage.setCode}
        request={overview?.myRequest ?? null}
        busy={busy}
        onSubmit={() => void run(manage.requestJoin)}
        onCancel={() => void run(manage.cancelRequest)}
      />
      {admin && <HistoryCard entries={overview?.history ?? []} />}
      <AppearanceCard />
      <View style={s.card}>
        <Text style={s.heading}>Conta</Text>
        <Text style={s.muted}>{profile.email}</Text>
        <Text style={s.muted}>{pushMessages[notifications.status]}</Text>
      </View>
      <Button
        title="Sair da conta"
        variant="danger"
        disabled={busy}
        onPress={() =>
          void run(async () => {
            const confirmed = await confirmAction(
              "Sair da conta",
              "Você deixará de receber avisos neste aparelho até entrar novamente. Deseja sair?",
              "Sair",
            );
            if (confirmed) await logout();
          })
        }
      />
    </>
  );
}
