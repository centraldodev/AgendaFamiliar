import type { User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import {
  joinRequestActions,
  type PushStatus,
} from "../services/notifications/notificationActions";
import { registerForPushNotifications } from "../services/notifications/registerForPushNotifications";
import { subscribeToNotifications } from "../services/notifications/subscribeToNotifications";
interface NotificationHandlers {
  onReceived: () => void;
  onJoinAction: (requestId: string, actionId: string) => void;
  onOpen: (type?: string) => void;
}
const joinActionIds: string[] = Object.values(joinRequestActions);
export function useNotificationController(
  user: User | null,
  handlers: NotificationHandlers,
) {
  const [status, setStatus] = useState<PushStatus>("unknown");
  const latest = useRef(handlers);
  latest.current = handlers;
  const handled = useRef(new Set<string>());
  useEffect(() => {
    if (!user) {
      setStatus("unknown");
      return;
    }
    let cancelled = false;
    void registerForPushNotifications().then((next) => {
      if (!cancelled) setStatus(next);
    });
    const unsubscribe = subscribeToNotifications({
      onReceived: () => latest.current.onReceived(),
      onResponse: (response) => {
        const key = `${response.notification.request.identifier}:${response.actionIdentifier}`;
        if (handled.current.has(key)) return;
        handled.current.add(key);
        const data = response.notification.request.content.data as {
          type?: string;
          requestId?: string;
        };
        if (
          data?.type === "join_request" &&
          data.requestId &&
          joinActionIds.includes(response.actionIdentifier)
        )
          latest.current.onJoinAction(data.requestId, response.actionIdentifier);
        else latest.current.onOpen(data?.type);
      },
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user?.uid]);
  return { status };
}
