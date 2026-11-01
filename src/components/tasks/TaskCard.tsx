import { Pressable, Text, View } from "react-native";
import { categoryIcon, categoryLabel } from "../../constants/categories";
import { describeRecurrence } from "../../utils/describeRecurrence";
import { canCompleteTask } from "../../middlewares/canCompleteTask";
import { canDeleteTask } from "../../middlewares/canDeleteTask";
import { canEditTask } from "../../middlewares/canEditTask";
import { canRestoreTask } from "../../middlewares/canRestoreTask";
import type { Profile } from "../../models/Profile";
import type { Task } from "../../models/Task";
import { useTheme } from "../../styles/theme";
import { dueStatus } from "../../utils/dueStatus";
import { groupSubtasks } from "../../utils/groupSubtasks";
import { formatShortDate } from "../../utils/formatShortDate";
import { CheckBox } from "../ui/CheckBox";
import { Icon } from "../ui/Icon";
import { SwipeableRow } from "../ui/SwipeableRow";
export function TaskCard({
  task,
  profile,
  busy,
  onEdit,
  onToggle,
  onToggleSubtask,
  onSkip,
  onDelete,
}: {
  task: Task;
  profile: Profile;
  busy: boolean;
  onEdit: (task: Task) => void;
  onToggle: (task: Task) => void;
  onToggleSubtask: (task: Task, subtaskId: string) => void;
  onSkip: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const { s, colors } = useTheme();
  // Concluídas ficam travadas; só um administrador as restaura.
  const closed = task.completed || !!task.skipped;
  const canComplete = !closed && canCompleteTask(task, profile);
  const canSkip = canComplete && !!task.recurrence && task.recurrence !== "none";
  const canRestore = canRestoreTask(task, profile);
  const canToggle = canComplete || canRestore;
  const canEdit = canEditTask(task, profile);
  const status = dueStatus(task);
  const due = [task.dueDate && formatShortDate(task.dueDate), task.dueTime]
    .filter(Boolean)
    .join(" ");
  return (
    <SwipeableRow
      disabled={busy}
      right={
        canToggle
          ? { label: canRestore ? "Restaurar" : "Concluir", onSwipe: () => onToggle(task) }
          : undefined
      }
      left={
        canDeleteTask(task, profile)
          ? { label: "Excluir", onSwipe: () => onDelete(task) }
          : undefined
      }
    >
      {/* O cartão inteiro abre a edição; caixinhas e "Pular" tratam o próprio toque. */}
      <Pressable
        accessibilityRole={canEdit ? "button" : undefined}
        accessibilityLabel={canEdit ? `Editar ${task.title}` : undefined}
        disabled={busy || !canEdit}
        onPress={() => onEdit(task)}
        style={({ pressed }) => [
          s.card,
          status === "overdue" && s.cardOverdue,
          status === "soon" && s.cardSoon,
          pressed && { backgroundColor: colors.surfaceMuted },
        ]}
      >
        <View style={[s.row, { alignItems: "flex-start", justifyContent: "flex-start" }]}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={canRestore ? "Restaurar tarefa" : "Concluir tarefa"}
            accessibilityState={{ checked: task.completed, disabled: busy || !canToggle }}
            disabled={busy || !canToggle}
            hitSlop={10}
            onPress={() => onToggle(task)}
          >
            <CheckBox checked={task.completed} size={26} dimmed={!canToggle && !task.completed} />
          </Pressable>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={[s.inlineAction, { gap: 5 }]}>
              <Icon name={categoryIcon(task.category)} size={14} color={colors.textSecondary} />
              <Text style={[s.tag, { flex: 1 }]}>
                {categoryLabel(task.category)}
                {describeRecurrence(task) ? ` · ${describeRecurrence(task)}` : ""}
              </Text>
            </View>
            {!!task.assignedTo && (
              <View style={[s.inlineAction, { gap: 5 }]}>
                <Icon name="person-outline" size={14} color={colors.accent} />
                <Text style={[s.tag, { color: colors.accent }]}>
                  {task.assignedTo === profile.uid ? "Com você" : `Com ${task.assignedToName ?? "um membro"}`}
                </Text>
              </View>
            )}
            <Text
              style={[
                s.taskTitle,
                closed && {
                  textDecorationLine: "line-through",
                  color: colors.textSubtle,
                },
              ]}
            >
              {task.title}
            </Text>
            {task.skipped && <Text style={s.skippedText}>Pulada · não concluída</Text>}
          </View>
          {canSkip && (
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => onSkip(task)} hitSlop={8}>
              <View style={s.inlineAction}>
                <Icon name="play-skip-forward-outline" size={16} />
                <Text style={[s.link, { paddingVertical: 0 }]}>Pular</Text>
              </View>
            </Pressable>
          )}
        </View>
        {!!task.description && <Text style={s.muted}>{task.description}</Text>}
        {!!task.subtasks?.length && (
          <View style={{ gap: 4 }}>
            <Text style={s.label}>
              Subtarefas · {task.subtasks.filter((item) => item.completed).length}/
              {task.subtasks.length}
            </Text>
            {groupSubtasks(task.subtasks).map((group, _, groups) => (
              <View key={group.key || "none"} style={{ gap: 4 }}>
                {/* Cabeçalho só quando há categorias para separar. */}
                {(groups.length > 1 || !!group.key) && (
                  <View style={[s.inlineAction, { gap: 5 }]}>
                  <Icon name={categoryIcon(group.key)} size={14} color={colors.textMuted} />
                  <Text style={[s.muted, { fontWeight: "600" }]}>{group.label}</Text>
                </View>
                )}
                {group.items.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="checkbox"
                    accessibilityLabel={item.title}
                    accessibilityState={{ checked: item.completed, disabled: busy || !canComplete }}
                    disabled={busy || !canComplete}
                    hitSlop={4}
                    // A linha inteira (caixa e texto) marca a subtarefa.
                    style={({ pressed }) => [s.subtaskRow, pressed && { opacity: 0.6 }]}
                    onPress={() => onToggleSubtask(task, item.id)}
                  >
                    <CheckBox checked={item.completed} />
                    <Text
                      style={[
                        s.subtaskText,
                        item.completed && {
                          textDecorationLine: "line-through",
                          color: colors.placeholder,
                        },
                      ]}
                    >
                      {item.title}
                      {item.dueDate || item.dueTime
                        ? ` · ${[item.dueDate?.split("-").reverse().join("/"), item.dueTime]
                            .filter(Boolean)
                            .join(" ")}`
                        : ""}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        )}
        <View style={s.cardFooter}>
          <Text style={s.footerText}>
            {task.createdAt ? `Criada em ${formatShortDate(task.createdAt)}` : "Criada em —"}
            {due ? "  ·  " : ""}
            {due ? (
              <Text
                style={[
                  status === "overdue" && s.overdueText,
                  status === "soon" && s.soonText,
                ]}
              >
                {status === "overdue" ? `Venceu ${due}` : `Vence ${due}`}
                {status === "overdue" ? " · Vencida" : status === "soon" ? " · Vence em breve" : ""}
              </Text>
            ) : null}
          </Text>
          <Text style={s.footerText}>
            Por {task.createdByName ?? "—"}
            {task.lastModifiedByName ? `  ·  Editada por ${task.lastModifiedByName}` : ""}
          </Text>
        </View>
      </Pressable>
    </SwipeableRow>
  );
}
