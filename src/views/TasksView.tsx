import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { TaskCardList } from "../components/tasks/TaskCardList";
import { Button } from "../components/ui/Button";
import type { AgendaController } from "../controllers/AgendaController";
import { canCreatePrivateTask } from "../middlewares/canCreatePrivateTask";
import { filterTasks } from "../utils/filterTasks";
import { useTheme } from "../styles/theme";
const emptyMessages = {
  today: "Nada pendente para hoje.",
  overdue: "Nenhuma tarefa vencida.",
  upcoming: "Nenhuma tarefa futura agendada.",
  completed: "Nenhuma tarefa concluída ainda.",
  private: "Você não tem tarefas privadas.",
  all: "Nenhuma tarefa cadastrada. Toque em + para criar a primeira.",
} as const;
export function TasksView({ controller }: { controller: AgendaController }) {
  const { s } = useTheme();
  const { profile } = controller.session;
  const {
    error: taskError,
    loaded: tasksLoaded,
    visible,
    filter,
    setFilter,
    refresh,
    retry,
    tasks,
  } = controller.tasks;
  const { busy, run } = controller.actions;
  // Usuários comuns não criam tarefas privadas; o filtro só aparece quando útil.
  const showPrivate =
    !!profile && (canCreatePrivateTask(profile) || tasks.some((t) => t.isPrivate));
  // Sem o chip "Privadas" (papel mudou ou nenhuma restou), volta ao filtro padrão.
  useEffect(() => {
    if (filter === "private" && !showPrivate) setFilter("today");
  }, [filter, showPrivate]);
  if (!profile) return null;
  return (
    <>
      {!!taskError && (
        <View accessibilityRole="alert" style={s.error}>
          <Text style={s.errorText}>{taskError}</Text>
          <Button
            title="Tentar carregar tarefas novamente"
            variant="secondary"
            disabled={busy}
            onPress={() => void run(retry)}
          />
        </View>
      )}
      <View style={s.chips}>
        {(
          [
            ["today", "Hoje"],
            ["overdue", "Vencidas"],
            ["upcoming", "Futuras"],
            ["completed", "Concluídas"],
            ...(showPrivate ? ([["private", "Privadas"]] as const) : []),
            ["all", "Todas"],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            style={[s.chip, filter === key && s.selectedChip]}
            onPress={() => setFilter(key)}
          >
            <Text style={[s.chipText, filter === key && s.selectedChipText]}>
              {label}
              {key === "today" || key === "overdue" || key === "upcoming"
                ? ` (${filterTasks(tasks, key).length})`
                : ""}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={s.row}>
        <Text style={s.muted}>Sua agenda · {visible.length} tarefas</Text>
        <Pressable disabled={busy} onPress={() => void run(refresh)}>
          <Text style={s.link}>Atualizar</Text>
        </Pressable>
      </View>
      {!visible.length && tasksLoaded && (
        <View style={s.card}>
          <Text style={s.heading}>Tudo tranquilo por aqui.</Text>
          <Text style={s.muted}>{emptyMessages[filter]}</Text>
        </View>
      )}
      <TaskCardList controller={controller} tasks={visible} />
      <Text style={s.footer}>
        A agenda atualiza automaticamente a cada 20 segundos.
      </Text>
    </>
  );
}
