import { Platform } from "react-native";
import { loadNotifications } from "./loadNotifications";
import { joinRequestActions, joinRequestCategory } from "./notificationActions";
let configured = false;
export async function configureNotifications() {
  const Notifications = loadNotifications();
  if (!Notifications || configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("default", {
      name: "Avisos da família",
      importance: Notifications.AndroidImportance.HIGH,
    });
  await Notifications.setNotificationCategoryAsync(joinRequestCategory, [
    {
      identifier: joinRequestActions.approveUser,
      buttonTitle: "Aceitar como usuário",
      options: { opensAppToForeground: true },
    },
    {
      identifier: joinRequestActions.approveAdmin,
      buttonTitle: "Aceitar como admin",
      options: { opensAppToForeground: true },
    },
    {
      identifier: joinRequestActions.reject,
      buttonTitle: "Recusar",
      options: { opensAppToForeground: true, isDestructive: true },
    },
  ]);
}
