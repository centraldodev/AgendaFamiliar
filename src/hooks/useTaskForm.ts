import { useTaskStore } from "@store/taskStore";
import { useUserStore } from "@store/userStore";
import type { RecurrenceType, Subtask, Task, WeekDay } from "@types";
import { useEffect, useState } from "react";
import { Alert } from "react-native";

interface UseTaskFormProps {
  taskId?: string;
  initialDate?: string; // Format: YYYY-MM-DD
  onSuccess: () => void;
}

interface TaskFormData {
  title: string;
  description: string;
  dueDate: Date;
  dueTime: Date | null;
  category: string;
  recurrence: RecurrenceType;
  subtasks: Subtask[];
}

/**
 * Custom hook to manage task form state and logic
 * Follows Single Responsibility Principle - only handles form logic
 */
export const useTaskForm = ({
  taskId,
  initialDate,
  onSuccess,
}: UseTaskFormProps) => {
  const { addTask, updateTask, getTaskById } = useTaskStore();
  const user = useUserStore((state) => state.user);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    // If initialDate is provided (from calendar), use it
    if (initialDate) {
      const [year, month, day] = initialDate.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [dueTime, setDueTime] = useState<Date | null>(null);
  const [category, setCategory] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrenceType>("none");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [weekDays, setWeekDays] = useState<WeekDay[]>([1, 3, 5]); // Default: Mon, Wed, Fri
  const [hasEndDate, setHasEndDate] = useState(false);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  // Load existing task if editing
  useEffect(() => {
    if (taskId) {
      const task = getTaskById(taskId);
      if (task) {
        setTitle(task.title);
        setDescription(task.description || "");

        // Parse date correctly
        // Parse date correctly from YYYY-MM-DD as local date
        const [year, month, day] = task.dueDate.split("-").map(Number);
        setDueDate(new Date(year, month - 1, day));

        if (task.dueTime) {
          const [hours, minutes] = task.dueTime.split(":").map(Number);
          const time = new Date();
          time.setHours(hours, minutes);
          setDueTime(time);
        }

        setCategory(task.category);
        setRecurrence(task.recurrence);
        setSubtasks(task.subtasks || []);
        setIsPrivate(task.isPrivate || false);
        if (task.weekDays) setWeekDays(task.weekDays);
        if (task.recurrenceEndDate) {
          setHasEndDate(true);
          const [y, m, d] = task.recurrenceEndDate.split("-").map(Number);
          setRecurrenceEndDate(new Date(y, m - 1, d));
        }
      }
    }
  }, [taskId, getTaskById]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Erro", "Título da tarefa é obrigatório");
      return;
    }

    if (!category) {
      Alert.alert("Erro", "Selecione uma categoria para a tarefa");
      return;
    }

    if (recurrence === "custom_weekly" && weekDays.length === 0) {
      Alert.alert("Erro", "Selecione ao menos um dia da semana para a recorrência");
      return;
    }

    setLoading(true);
    try {
      // Format date as YYYY-MM-DD
      const year = dueDate.getFullYear();
      const month = String(dueDate.getMonth() + 1).padStart(2, "0");
      const day = String(dueDate.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;

      let formattedTime = undefined;
      if (dueTime) {
        const hours = String(dueTime.getHours()).padStart(2, "0");
        const minutes = String(dueTime.getMinutes()).padStart(2, "0");
        formattedTime = `${hours}:${minutes}`;
      } else if (!taskId) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        formattedTime = `${hours}:${minutes}`;
      }

      const taskData = {
        title: title.trim(),
        description: description.trim(),
        dueDate: formattedDate,
        dueTime: formattedTime,
        category,
        recurrence,
        subtasks,
        completed: false,
        familyId: user?.familyId || "",
        createdBy: user?.uid || "",
        isPrivate,
        weekDays: recurrence === "custom_weekly" ? weekDays : undefined,
        recurrenceEndDate:
          recurrence !== "none" && hasEndDate && recurrenceEndDate
            ? `${recurrenceEndDate.getFullYear()}-${String(
                recurrenceEndDate.getMonth() + 1,
              ).padStart(2, "0")}-${String(
                recurrenceEndDate.getDate(),
              ).padStart(2, "0")}`
            : undefined,
      };

      if (taskId) {
        await updateTask(taskId, taskData);
      } else {
        await addTask(taskData as Task);
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving task:", error);
      Alert.alert("Erro", "Não foi possível salvar a tarefa");
    } finally {
      setLoading(false);
    }
  };

  const addSubtask = (subtaskTitle: string, subtaskCategory: string) => {
    if (!subtaskTitle.trim()) return;

    const newSubtask: Subtask = {
      id: Date.now().toString(),
      title: subtaskTitle.trim(),
      completed: false,
      category: subtaskCategory,
    };

    setSubtasks([...subtasks, newSubtask]);
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter((s) => s.id !== id));
  };

  return {
    // State
    title,
    description,
    dueDate,
    dueTime,
    category,
    recurrence,
    subtasks,
    isPrivate,
    weekDays,
    hasEndDate,
    recurrenceEndDate,
    loading,

    // Setters
    setTitle,
    setDescription,
    setDueDate,
    setDueTime,
    setCategory,
    setRecurrence,
    setIsPrivate,
    setWeekDays,
    setHasEndDate,
    setRecurrenceEndDate,

    // Actions
    handleSave,
    addSubtask,
    removeSubtask,
  };
};
