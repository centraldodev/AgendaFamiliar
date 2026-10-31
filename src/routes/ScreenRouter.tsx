import { TaskSkeleton } from "../components/tasks/TaskSkeleton";
import { AgendaTabs } from "../components/layout/AgendaTabs";
import type { AgendaController } from "../controllers/AgendaController";
import { AuthView } from "../views/AuthView";
import { FamilySetupView } from "../views/FamilySetupView";
import { FamilyView } from "../views/FamilyView";
import { TaskFormView } from "../views/TaskFormView";
import { TasksView } from "../views/TasksView";
export function ScreenRouter({ controller }: { controller: AgendaController }) {
  const { session, tasks, taskForm, tab, setTab } = controller;
  if (session.loading) return <TaskSkeleton />;
  if (!session.user) return <AuthView controller={controller} />;
  if (session.profile && !session.profile.familyId)
    return <FamilySetupView controller={controller} />;
  if (!session.profile || !session.family) return null;
  return (
    <>
      <AgendaTabs
        tab={tab}
        onChange={(value) => {
          setTab(value);
          taskForm.setForm(false);
        }}
      />
      {tab === "family" ? (
        <FamilyView controller={controller} />
      ) : taskForm.form ? (
        <TaskFormView controller={controller} />
      ) : tasks.loading ? (
        <TaskSkeleton showNavigation={false} />
      ) : (
        <TasksView controller={controller} />
      )}
    </>
  );
}
