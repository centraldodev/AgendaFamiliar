import { useState } from "react";
import type { Profile } from "../models/Profile";
import type { RecurrenceRule } from "../models/Recurrence";
import type { Subtask } from "../models/Subtask";
import type { Task } from "../models/Task";
import { saveTask } from "../services/tasks/saveTask";
import { today } from "../utils/today";
export function useTaskFormController(
  profile: Profile | null,
  refresh: () => Promise<void>,
  clearError: () => void,
) {
  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("");
  const [category, setCategory] = useState("home");
  const [privateTask, setPrivate] = useState(false);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>({
    recurrence: "none",
  });
  // Sem tarefa, cria uma nova; "date" pré-preenche o vencimento (ex.: calendário).
  const openForm = (task?: Task, date?: string) => {
    setEditing(task ?? null);
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setDate(task?.dueDate || date || today());
    setTime(task?.dueTime ?? "");
    setCategory(task?.category ?? "home");
    setPrivate(task?.isPrivate ?? false);
    setAssignedTo(task?.assignedTo ?? null);
    setSubtasks(task?.subtasks ?? []);
    setRecurrenceRule({
      recurrence: task?.recurrence ?? "none",
      recurrenceInterval: task?.recurrenceInterval ?? null,
      weekDays: task?.weekDays ?? [],
      recurrenceEndDate: task?.recurrenceEndDate ?? null,
    });
    setForm(true);
    clearError();
  };
  const addSubtask = (title: string) =>
    setSubtasks((items) => [
      ...items,
      { id: `${Date.now()}-${items.length}`, title, completed: false },
    ]);
  const updateSubtask = (id: string, patch: Partial<Subtask>) =>
    setSubtasks((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  const removeSubtask = (id: string) =>
    setSubtasks((items) => items.filter((item) => item.id !== id));
  const submit = async () => {
    if (!profile) throw new Error("Entre na sua conta.");
    await saveTask(
      profile,
      {
        title,
        description,
        dueDate: date,
        dueTime: time || null,
        category,
        isPrivate: privateTask,
        // Privada não tem responsável.
        assignedTo: privateTask ? null : assignedTo,
        subtasks,
        ...recurrenceRule,
      },
      editing ?? undefined,
    );
    setForm(false);
    await refresh();
  };
  return {
    form,
    setForm,
    editing,
    title,
    setTitle,
    description,
    setDescription,
    date,
    setDate,
    time,
    setTime,
    category,
    setCategory,
    privateTask,
    setPrivate,
    assignedTo,
    setAssignedTo,
    subtasks,
    addSubtask,
    updateSubtask,
    removeSubtask,
    recurrenceRule,
    setRecurrenceRule,
    openForm,
    submit,
  };
}
