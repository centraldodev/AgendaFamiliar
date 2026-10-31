import { useEffect, useState } from "react";
import type { AgendaTab } from "../models/Navigation";
import { useAsyncActionController } from "./useAsyncActionController";
import { useAuthController } from "./useAuthController";
import { useFamilyController } from "./useFamilyController";
import { useSessionController } from "./useSessionController";
import { useTaskController } from "./useTaskController";
import { useTaskFormController } from "./useTaskFormController";
export function useAgendaController() {
  const actions = useAsyncActionController();
  const session = useSessionController();
  const tasks = useTaskController(session.profile, session.generation);
  const authentication = useAuthController(actions.setNotice);
  const familySetup = useFamilyController(session.adoptFamily);
  const taskForm = useTaskFormController(session.profile, tasks.refresh, () =>
    actions.setError(""),
  );
  const [tab, setTab] = useState<AgendaTab>("tasks");
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
    authentication,
    familySetup,
    taskForm,
    tab,
    setTab,
    showFab,
  };
}
