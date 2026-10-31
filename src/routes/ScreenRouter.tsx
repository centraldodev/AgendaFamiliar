import { TaskSkeleton } from "../components/tasks/TaskSkeleton";
import type { AgendaController } from "../controllers/AgendaController";
import { AuthView } from "../views/AuthView";
import { CalendarView } from "../views/CalendarView";
import { FamilySetupView } from "../views/FamilySetupView";
import { SettingsView } from "../views/SettingsView";
import { TaskFormView } from "../views/TaskFormView";
import { TasksView } from "../views/TasksView";
export function ScreenRouter({ controller }: { controller: AgendaController }) {
  const { session, tasks, tab } = controller;
  if (session.loading) return <TaskSkeleton />;
  if (!session.user) return <AuthView controller={controller} />;
  if (session.profile && !session.profile.familyId)
    return <FamilySetupView controller={controller} />;
  if (!session.profile || !session.family) return null;
  if (tab === "settings") return <SettingsView controller={controller} />;
  if (tasks.loading) return <TaskSkeleton showNavigation={false} />;
  if (tab === "calendar")
    return (
      <>
        <CalendarView controller={controller} />
        <TaskFormView controller={controller} />
      </>
    );
  // O formulário é um painel por cima da agenda, não uma tela própria.
  return (
    <>
      <TasksView controller={controller} />
      <TaskFormView controller={controller} />
    </>
  );
}
