import type { AgendaController } from "../../controllers/AgendaController";
import type { Task } from "../../models/Task";
import { confirmAction } from "../../utils/confirmAction";
import { TaskCard } from "./TaskCard";
// Cartões com as ações da agenda (concluir, pular, excluir e editar).
export function TaskCardList({
  controller,
  tasks,
}: {
  controller: AgendaController;
  tasks: Task[];
}) {
  const { profile } = controller.session;
  const { toggle, toggleItem, skip, remove } = controller.tasks;
  const { busy, run } = controller.actions;
  if (!profile) return null;
  return (
    <>
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          profile={profile}
          busy={busy}
          onEdit={(task) => controller.taskForm.openForm(task)}
          onToggle={(task) => void run(() => toggle(task))}
          onToggleSubtask={(task, id) => void run(() => toggleItem(task, id))}
          onSkip={(task) =>
            void run(async () => {
              const confirmed = await confirmAction(
                "Pular recorrência",
                `"${task.title}" será arquivada como não concluída e a próxima data será criada.`,
              );
              if (confirmed) await skip(task);
            })
          }
          onDelete={(task) =>
            void run(async () => {
              const confirmed = await confirmAction(
                "Excluir tarefa",
                `Excluir "${task.title}" para toda a família? Esta ação não pode ser desfeita.`,
              );
              if (confirmed) await remove(task);
            })
          }
        />
      ))}
    </>
  );
}
