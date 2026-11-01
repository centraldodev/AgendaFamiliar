import { useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import type { TaskFilter } from "../models/Navigation";
import type { Profile } from "../models/Profile";
import type { Task } from "../models/Task";
import { advanceTask } from "../services/tasks/advanceTask";
import { deleteTask } from "../services/tasks/deleteTask";
import { subscribeTasks } from "../services/tasks/subscribeTasks";
import { readTaskCache, writeTaskCache } from "../services/tasks/taskCache";
import { toggleSubtask } from "../services/tasks/toggleSubtask";
import { toggleTask } from "../services/tasks/toggleTask";
import { filterTasks } from "../utils/filterTasks";
import { message } from "../utils/message";
import { searchTasks } from "../utils/searchTasks";
/** Ação adiada por alguns segundos para dar tempo de desfazer. */
export interface PendingAction {
  taskId: string;
  label: string;
}
const undoMs = 5000;
// Tarefas da família em tempo real (sem consulta periódica). Sem internet, mostra a
// última lista salva no aparelho até o Firestore responder.
export function useTaskController(
  profile: Profile | null,
  names: Map<string, string>,
  onActionError: (error: unknown) => void,
) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<TaskFilter>("today");
  const [search, setSearch] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const pendingRun = useRef<{ run: () => Promise<void>; timer: ReturnType<typeof setTimeout> } | null>(null);
  const namesRef = useRef(names);
  namesRef.current = names;
  const feed = useRef<ReturnType<typeof subscribeTasks> | null>(null);
  const uid = profile?.uid;
  const familyId = profile?.familyId;
  useEffect(() => {
    setTasks([]);
    setLoading(true);
    setLoaded(false);
    setError("");
    if (!uid || !familyId) return;
    let live = false;
    let active = true;
    void readTaskCache(uid).then((cached) => {
      if (!active || live || !cached) return;
      setTasks(cached);
      setLoading(false);
    });
    const subscription = subscribeTasks(
      uid,
      familyId,
      () => namesRef.current,
      (value) => {
        live = true;
        setTasks(value);
        setLoaded(true);
        setLoading(false);
        setError("");
        writeTaskCache(uid, value);
      },
      (failure) => {
        setError(message(failure));
        setLoading(false);
      },
    );
    feed.current = subscription;
    return () => {
      active = false;
      subscription.stop();
      if (feed.current === subscription) feed.current = null;
    };
  }, [uid, familyId, attempt]);
  // Nomes chegam da lista de membros; reaplica sem reconsultar.
  useEffect(() => feed.current?.reemit(), [names]);
  // Executa já a ação adiada (ex.: outra ação começou ou a tela vai sumir).
  const commit = async () => {
    const current = pendingRun.current;
    if (!current) return;
    clearTimeout(current.timer);
    pendingRun.current = null;
    setPending(null);
    try {
      await current.run();
    } catch (failure) {
      onActionError(failure);
    }
  };
  const commitRef = useRef(commit);
  commitRef.current = commit;
  useEffect(() => () => void commit(), [uid]);
  // O app pode ser fechado em segundo plano: grava antes que a ação se perca.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") void commitRef.current();
    });
    return () => subscription.remove();
  }, []);
  const defer = async (task: Task, label: string, run: () => Promise<void>) => {
    await commit();
    setPending({ taskId: task.id, label });
    pendingRun.current = { run, timer: setTimeout(() => void commit(), undoMs) };
  };
  const undo = () => {
    if (pendingRun.current) clearTimeout(pendingRun.current.timer);
    pendingRun.current = null;
    setPending(null);
  };
  // Em tempo real não há o que buscar; mantém a assinatura para "puxar para atualizar".
  const refresh = async () => {};
  const retry = async () => setAttempt((n) => n + 1);
  // Concluir e excluir esperam alguns segundos (dá para desfazer); restaurar é imediato.
  const toggle = async (task: Task) => {
    if (task.completed || task.skipped) return toggleTask(task);
    await defer(task, "Tarefa concluída", () => toggleTask(task));
  };
  // Marca na hora (otimista); se o servidor recusar, desmarca de volta.
  const toggleItem = async (task: Task, subtaskId: string) => {
    const flip = () => setTasks((current) =>
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
    flip();
    try {
      await toggleSubtask(task, subtaskId);
    } catch (failure) {
      flip();
      throw failure;
    }
  };
  const skip = async (task: Task) => {
    await commit();
    await advanceTask(task.id, "skip");
  };
  const remove = async (task: Task) => {
    if (!profile) throw new Error("Entre na sua conta.");
    await defer(task, "Tarefa excluída", () => deleteTask(profile, task));
  };
  // A tarefa com ação pendente some da lista enquanto dá para desfazer.
  const shown = useMemo(
    () => (pending ? tasks.filter((task) => task.id !== pending.taskId) : tasks),
    [tasks, pending],
  );
  const visible = useMemo(
    () => searchTasks(filterTasks(shown, filter, undefined, undefined, uid), search),
    [shown, filter, search, uid],
  );
  return {
    tasks: shown,
    loading,
    loaded,
    error,
    filter,
    setFilter,
    search,
    setSearch,
    visible,
    pending,
    undo,
    refresh,
    retry,
    toggle,
    toggleItem,
    skip,
    remove,
  };
}
