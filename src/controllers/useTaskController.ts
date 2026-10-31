import { useEffect, useRef, useState, type RefObject } from "react";
import type { TaskFilter } from "../models/Navigation";
import type { Profile } from "../models/Profile";
import type { Task } from "../models/Task";
import { loadTasks } from "../services/tasks/loadTasks";
import { usePolling } from "./usePolling";
import { deleteTask } from "../services/tasks/deleteTask";
import { advanceTask } from "../services/tasks/advanceTask";
import { toggleSubtask } from "../services/tasks/toggleSubtask";
import { toggleTask } from "../services/tasks/toggleTask";
import { filterTasks } from "../utils/filterTasks";
import { message } from "../utils/message";
import { createReadController } from "./requests/createReadController";
export function useTaskController(
  profile: Profile | null,
  generation: RefObject<number>,
) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<TaskFilter>("today");
  const feed = useRef<ReturnType<typeof createReadController<Task[]>> | null>(
    null,
  );
  useEffect(() => {
    setTasks([]);
    setLoading(true);
    setLoaded(false);
    setError("");
    if (!profile?.familyId) return;
    const token = generation.current;
    const controller = createReadController({
      load: loadTasks,
      onData: (value: Task[]) => {
        setTasks(value);
        setLoaded(true);
      },
      onError: (error) => setError(error ? message(error) : ""),
      onSettled: () => setLoading(false),
      isCurrent: () => token === generation.current,
    });
    feed.current = controller;
    void controller.refresh().catch(() => {});
    return () => {
      controller.close();
      if (feed.current === controller) feed.current = null;
    };
  }, [profile?.uid, profile?.familyId, generation]);
  usePolling(
    () => void feed.current?.refresh().catch(() => {}),
    60000,
    !!profile?.familyId,
  );
  const refresh = async () => {
    await feed.current?.refresh(true);
  };
  const retry = async () => {
    setLoading(!loaded);
    await refresh();
  };
  const toggle = async (task: Task) => {
    await toggleTask(task);
    await refresh();
  };
  // Marca na hora (otimista); se o servidor recusar, a recarga desfaz.
  const toggleItem = async (task: Task, subtaskId: string) => {
    setTasks((current) =>
      current.map((item) =>
        item.id !== task.id
          ? item
          : {
              ...item,
              subtasks: item.subtasks?.map((sub) =>
                sub.id === subtaskId ? { ...sub, completed: !sub.completed } : sub,
              ),
            },
      ),
    );
    try {
      await toggleSubtask(task, subtaskId);
    } finally {
      await refresh();
    }
  };
  const skip = async (task: Task) => {
    await advanceTask(task.id, "skip");
    await refresh();
  };
  const remove = async (task: Task) => {
    if (!profile) throw new Error("Entre na sua conta.");
    await deleteTask(profile, task);
    await refresh();
  };
  return {
    tasks,
    loading,
    loaded,
    error,
    filter,
    setFilter,
    visible: filterTasks(tasks, filter),
    refresh,
    retry,
    toggle,
    toggleItem,
    skip,
    remove,
  };
}
