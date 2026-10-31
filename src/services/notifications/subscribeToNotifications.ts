import type { NotificationResponse } from "expo-notifications";
import { loadNotifications } from "./loadNotifications";
export function subscribeToNotifications(handlers: {
  onReceived: () => void;
  onResponse: (response: NotificationResponse) => void;
}) {
  const Notifications = loadNotifications();
  if (!Notifications) return () => {};
  try {
    const received = Notifications.addNotificationReceivedListener(
      handlers.onReceived,
    );
    const response = Notifications.addNotificationResponseReceivedListener(
      handlers.onResponse,
    );
    // Toque que abriu o app a partir do zero (aplicativo estava fechado).
    void Notifications.getLastNotificationResponseAsync()
      .then((last) => {
        if (last) handlers.onResponse(last);
      })
      .catch(() => {});
    return () => {
      received.remove();
      response.remove();
    };
  } catch {
    return () => {};
  }
}
