import { useEffect, useRef, useState } from "react";
import { isAdmin } from "../middlewares/isAdmin";
import type { FamilyOverview } from "../models/FamilyOverview";
import type { FamilyRole } from "../models/FamilyRole";
import { approveJoinRequest } from "../services/families/approveJoinRequest";
import { cancelJoinRequest } from "../services/families/cancelJoinRequest";
import { changeMemberRole } from "../services/families/changeMemberRole";
import { familyAction } from "../services/families/familyAction";
import { loadFamilyOverview } from "../services/families/loadFamilyOverview";
import { rejectJoinRequest } from "../services/families/rejectJoinRequest";
import { removeFamilyMember } from "../services/families/removeFamilyMember";
import { joinRequestActions } from "../services/notifications/notificationActions";
import { withReadTimeout } from "../utils/withReadTimeout";
import { usePolling } from "./usePolling";
import type { useSessionController } from "./useSessionController";
// Área da família nas configurações: membros, solicitações, histórico e troca de grupo.
export function useFamilyManagementController(
  session: ReturnType<typeof useSessionController>,
  settingsOpen: boolean,
  notify: (message: string) => void,
) {
  const [overview, setOverview] = useState<FamilyOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const familyId = session.profile?.familyId;
  const refresh = async () => {
    if (!familyId) return;
    const data = await withReadTimeout(loadFamilyOverview());
    setOverview(data);
    // Papel ou grupo mudaram no servidor (aprovação, remoção, troca de papel).
    if (!data.familyId)
      notify("Você não faz mais parte do grupo. Entre em outro ou crie um novo.");
    if (
      data.familyId !== familyId ||
      (data.role === "admin") !== isAdmin(session.profile)
    )
      await session.refreshQuietly();
  };
  const latestRefresh = useRef(refresh);
  latestRefresh.current = refresh;
  useEffect(() => {
    setOverview(null);
    setCode("");
    if (!familyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    latestRefresh.current()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [familyId, session.user?.uid, settingsOpen]);
  // Nas configurações a lista está à vista; fora delas basta notar mudança de papel ou grupo.
  usePolling(
    () => void latestRefresh.current().catch(() => {}),
    settingsOpen ? 30000 : 120000,
    !!familyId,
  );
  const act = async (action: () => Promise<void>, notice: string) => {
    await action();
    await refresh();
    notify(notice);
  };
  const approve = (requestId: string, role: FamilyRole) =>
    act(() => approveJoinRequest(requestId, role), "Entrada aprovada.");
  const reject = (requestId: string) =>
    act(() => rejectJoinRequest(requestId), "Solicitação recusada.");
  const setRole = (uid: string, role: FamilyRole) =>
    act(() => changeMemberRole(uid, role), "Tipo de acesso atualizado.");
  const remove = (uid: string) =>
    act(() => removeFamilyMember(uid), "Membro removido do grupo.");
  const requestJoin = () =>
    act(async () => {
      await familyAction("join", code);
      setCode("");
    }, "Solicitação enviada. Aguarde a aprovação de um administrador.");
  const cancelRequest = () =>
    act(cancelJoinRequest, "Solicitação cancelada.");
  // Botões da notificação do celular: aceitar (usuário/admin) ou recusar.
  const decideFromNotification = (requestId: string, actionId: string) =>
    actionId === joinRequestActions.reject
      ? reject(requestId)
      : approve(
          requestId,
          actionId === joinRequestActions.approveAdmin ? "admin" : "user",
        );
  return {
    overview,
    loading,
    code,
    setCode,
    refresh,
    approve,
    reject,
    setRole,
    remove,
    requestJoin,
    cancelRequest,
    decideFromNotification,
    pendingCount: overview?.pending.length ?? 0,
  };
}
