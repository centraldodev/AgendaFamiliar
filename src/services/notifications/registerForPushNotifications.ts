import Constants from "expo-constants";
import * as Device from "expo-device";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../config/firebase";
import { configureNotifications } from "./configureNotifications";
import { loadNotifications } from "./loadNotifications";
import type { PushStatus } from "./notificationActions";
import { pushTokenStore } from "./pushTokenStore";
// Pede permissão, obtém o token do aparelho e o associa à conta no backend.
export async function registerForPushNotifications(): Promise<PushStatus> {
  const Notifications = loadNotifications();
  if (!Notifications || !Device.isDevice) return "unavailable";
  try {
    await configureNotifications();
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted")
      status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return "denied";
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) return "unavailable";
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    await httpsCallable(functions, "agendaPushToken")({
      action: "register",
      token,
    });
    pushTokenStore.set(token);
    return "enabled";
  } catch {
    return "unavailable";
  }
}
