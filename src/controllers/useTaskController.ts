import { useEffect, useRef, useState, type RefObject } from "react";
import type { TaskFilter } from "../models/Navigation";
import type { Profile } from "../models/Profile";
import type { Task } from "../models/Task";
import { loadTasks } from "../services/tasks/loadTasks";
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
  const [filter, setFilter] = useState<TaskFilter>("pending");
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
    const tick = () => {
      void controller.refresh().catch(() => {});
    };
    tick();
    const timer = setInterval(tick, 20000);
    return () => {
      controller.close();
      clearInterval(timer);
      if (feed.current === controller) feed.current = null;
    };
  }, [profile?.uid, profile?.familyId, generation]);
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
  };
}
