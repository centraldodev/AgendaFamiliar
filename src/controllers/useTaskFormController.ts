import { useState } from "react";
import type { Profile } from "../models/Profile";
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
  const openForm = (task?: Task) => {
    setEditing(task ?? null);
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setDate(task?.dueDate ?? today());
    setTime(task?.dueTime ?? "");
    setCategory(task?.category ?? "home");
    setPrivate(task?.isPrivate ?? false);
    setForm(true);
    clearError();
  };
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
    openForm,
    submit,
  };
}
