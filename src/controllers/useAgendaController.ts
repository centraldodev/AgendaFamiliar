import { useEffect, useState } from "react";
import type { AgendaTab } from "../models/Navigation";
import { useAsyncActionController } from "./useAsyncActionController";
import { useBackNavigationController } from "./useBackNavigationController";
import { useCategoryController } from "./useCategoryController";
import { useAuthController } from "./useAuthController";
import { useFamilyController } from "./useFamilyController";
import { useFamilyManagementController } from "./useFamilyManagementController";
import { useNotificationController } from "./useNotificationController";
import { useSessionController } from "./useSessionController";
import { useTaskController } from "./useTaskController";
import { useTaskFormController } from "./useTaskFormController";
export function useAgendaController() {
  const actions = useAsyncActionController();
  const session = useSessionController();
  const [tab, setTab] = useState<AgendaTab>("tasks");
  const tasks = useTaskController(session.profile, session.generation);
  const categories = useCategoryController(session.profile);
  const authentication = useAuthController(actions.setNotice);
  const familySetup = useFamilyController(session, actions.setNotice);
  const familyManagement = useFamilyManagementController(
    session,
    tab === "settings",
    actions.setNotice,
  );
  const notifications = useNotificationController(session.user, {
    onReceived: () => {
      void tasks.refresh().catch(() => {});
      void familyManagement.refresh().catch(() => {});
      void familySetup.check().catch(() => {});
    },
    onJoinAction: (requestId, actionId) =>
      void actions.run(() =>
        familyManagement.decideFromNotification(requestId, actionId),
      ),
    // Avisos de tarefa abrem a agenda; os de família, as configurações.
    onOpen: (type) => {
      if (type?.startsWith("task_")) {
        setTab("tasks");
        void tasks.refresh().catch(() => {});
      } else setTab("settings");
    },
  });
  const taskForm = useTaskFormController(session.profile, tasks.refresh, () =>
    actions.setError(""),
  );
  const inFamily = !!session.profile?.familyId && !!session.family;
  useBackNavigationController(() => {
    if (!inFamily) return false;
    // O painel do formulário fecha antes; depois, calendário e configurações voltam à agenda.
    if (taskForm.form) {
      taskForm.setForm(false);
      return true;
    }
    if (tab === "settings" || tab === "calendar") {
      setTab("tasks");
      return true;
    }
    return false;
  });
  useEffect(() => {
    taskForm.setForm(false);
    setTab("tasks");
    actions.setError("");
  }, [session.user?.uid]);
  const showFab =
    !session.loading &&
    !tasks.loading &&
    !!session.profile?.familyId &&
    !!session.family &&
    tab === "tasks" &&
    !taskForm.form;
  return {
    actions,
    session,
    tasks,
    categories,
    authentication,
    familySetup,
    familyManagement,
    notifications,
    taskForm,
    tab,
    setTab,
    showFab,
  };
}
