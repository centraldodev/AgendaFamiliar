import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";
export type NotificationsModule = typeof import("expo-notifications");
// Carregamento sob demanda: o Expo Go no Android não suporta push remoto e o
// módulo falha ao ser importado (falta o módulo nativo ExpoApplication), então
// ele só é carregado onde funciona. Qualquer falha nativa desativa as notificações.
let cached: NotificationsModule | null | undefined;
export function loadNotifications(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  if (Platform.OS === "web" || (Platform.OS === "android" && isRunningInExpoGo()))
    return (cached = null);
  try {
    cached = require("expo-notifications") as NotificationsModule;
  } catch {
    cached = null;
  }
  return cached;
}
