import { Pressable, Text, View } from "react-native";
import { categories } from "../../constants/categories";
import { canCompleteTask } from "../../middlewares/canCompleteTask";
import type { Profile } from "../../models/Profile";
import type { Task } from "../../models/Task";
import { appStyles as s } from "../../styles/appStyles";
import { Button } from "../ui/Button";
export function TaskCard({
  task,
  profile,
  busy,
  onEdit,
  onToggle,
}: {
  task: Task;
  profile: Profile;
  busy: boolean;
  onEdit: (task: Task) => void;
  onToggle: (task: Task) => void;
}) {
  const canComplete = canCompleteTask(task, profile);
  return (
    <View style={s.card}>
      <View style={s.row}>
        <Text style={s.tag}>
          {task.isPrivate ? "🔒 Só você" : "Família"} ·{" "}
          {categories[task.category] ?? task.category}
        </Text>
        <Text style={s.muted}>{task.completed ? "Concluída" : "Pendente"}</Text>
      </View>
      <Text
        style={[
          s.taskTitle,
          task.completed && {
            textDecorationLine: "line-through",
            color: "#7e8982",
          },
        ]}
      >
        {task.title}
      </Text>
      {!!task.description && <Text style={s.muted}>{task.description}</Text>}
      <Text style={s.label}>
        {task.dueDate.split("-").reverse().join("/")}{" "}
        {task.dueTime ? `· ${task.dueTime}` : ""}
      </Text>
      <View style={s.row}>
        {canComplete && (
          <Button
            title={task.completed ? "Reabrir" : "Concluir"}
            secondary
            disabled={busy}
            onPress={() => void onToggle(task)}
          />
        )}
        {task.createdBy === profile.uid && (
          <Pressable disabled={busy} onPress={() => onEdit(task)}>
            <Text style={s.link}>Editar</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
