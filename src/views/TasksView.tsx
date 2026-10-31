import { Pressable, Text, View } from "react-native";
import { TaskCard } from "../components/tasks/TaskCard";
import { Button } from "../components/ui/Button";
import type { AgendaController } from "../controllers/AgendaController";
import { appStyles as s } from "../styles/appStyles";
export function TasksView({ controller }: { controller: AgendaController }) {
  const { profile } = controller.session;
  const {
    error: taskError,
    loaded: tasksLoaded,
    visible,
    filter,
    setFilter,
    refresh,
    retry,
    toggle,
  } = controller.tasks;
  const { busy, run } = controller.actions;
  const { openForm } = controller.taskForm;
  if (!profile) return null;
  return (
    <>
      {!!taskError && (
        <View accessibilityRole="alert" style={s.error}>
          <Text style={{ color: "#9b3434" }}>{taskError}</Text>
          <Button
            title="Tentar carregar tarefas novamente"
            secondary
            disabled={busy}
            onPress={() => void run(retry)}
          />
        </View>
      )}
      <View style={s.chips}>
        {(
          [
            ["pending", "Pendentes"],
            ["completed", "Concluídas"],
            ["private", "Privadas"],
            ["all", "Todas"],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            style={[s.chip, filter === key && s.selectedChip]}
            onPress={() => setFilter(key)}
          >
            <Text style={{ color: filter === key ? "#fff" : "#31574c" }}>
              {label}
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
          <Text style={s.muted}>As tarefas deste filtro aparecerão aqui.</Text>
        </View>
      )}
      {visible.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          profile={profile}
          busy={busy}
          onEdit={openForm}
          onToggle={(task) => void run(() => toggle(task))}
        />
      ))}
      <Text style={s.footer}>
        A agenda atualiza automaticamente a cada 20 segundos.
      </Text>
    </>
  );
}
