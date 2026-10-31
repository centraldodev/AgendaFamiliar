import { useEffect, useRef, useState } from "react";
import { requireAuthenticatedUser } from "../middlewares/requireAuthenticatedUser";
import type { MyJoinRequest } from "../models/JoinRequest";
import { cancelJoinRequest } from "../services/families/cancelJoinRequest";
import { familyAction } from "../services/families/familyAction";
import { loadFamilyOverview } from "../services/families/loadFamilyOverview";
import { loadSessionContext } from "../services/session/loadSessionContext";
import { withReadTimeout } from "../utils/withReadTimeout";
import { usePolling } from "./usePolling";
import type { useSessionController } from "./useSessionController";
// Tela de quem ainda não está em nenhum grupo: criar, pedir entrada e aguardar.
export function useFamilyController(
  session: ReturnType<typeof useSessionController>,
  notify: (message: string) => void,
) {
  const [familyName, setFamilyName] = useState("");
  const [code, setCode] = useState("");
  const [myRequest, setMyRequest] = useState<MyJoinRequest | null>(null);
  const hadRequest = useRef(false);
  const waiting = !!session.user && !!session.profile && !session.profile.familyId;
  const check = async () => {
    const overview = await withReadTimeout(loadFamilyOverview());
    if (overview.familyId) {
      hadRequest.current = false;
      setMyRequest(null);
      notify("Sua entrada foi aprovada. Bem-vindo ao grupo!");
      await session.refreshQuietly();
      return;
    }
    if (hadRequest.current && !overview.myRequest)
      notify("Sua solicitação foi encerrada. Fale com um administrador do grupo.");
    hadRequest.current = !!overview.myRequest;
    setMyRequest(overview.myRequest);
  };
  const latestCheck = useRef(check);
  latestCheck.current = check;
  useEffect(() => {
    hadRequest.current = false;
    setMyRequest(null);
    if (waiting) void latestCheck.current().catch(() => {});
  }, [waiting, session.user?.uid]);
  usePolling(() => void latestCheck.current().catch(() => {}), 30000, waiting);
  const join = async (action: "create" | "join") => {
    const user = requireAuthenticatedUser();
    await familyAction(action, action === "create" ? familyName : code);
    if (action === "join") {
      setCode("");
      await check();
      return;
    }
    const context = await withReadTimeout(loadSessionContext(user));
    if (!context.family) throw new Error("Família não encontrada.");
    session.adoptFamily(context.profile, context.family);
  };
  const cancel = async () => {
    await cancelJoinRequest();
    hadRequest.current = false;
    setMyRequest(null);
  };
  return {
    familyName,
    setFamilyName,
    code,
    setCode,
    join,
    myRequest,
    cancel,
    check,
  };
}
