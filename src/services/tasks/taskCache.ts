import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Task } from "../../models/Task";
// Última lista vista, para abrir sem internet. Fica só neste aparelho, por conta.
const key = (uid: string) => `agenda:tasks:${uid}`;
export async function readTaskCache(uid: string): Promise<Task[] | null> {
  const raw = await AsyncStorage.getItem(key(uid)).catch(() => null);
  try {
    return raw ? (JSON.parse(raw) as Task[]) : null;
  } catch {
    return null;
  }
}
export function writeTaskCache(uid: string, tasks: Task[]) {
  void AsyncStorage.setItem(key(uid), JSON.stringify(tasks)).catch(() => {});
}
export function clearTaskCache(uid: string) {
  void AsyncStorage.removeItem(key(uid)).catch(() => {});
}
