import type { Task } from "@types";
import {
    createBrasiliaDate,
    formatBrasiliaDateTime,
    secondsUntilDate,
} from "@utils/dateUtils";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/**
 * Name of the background task that processes push notifications sent by the
 * Cloud Function (functions/src/index.ts) when a family member changes a
 * shared task, so this device can reconcile its local notifications even
 * when the app is closed. Registered in index.js at the app entry point.
 */
export const BACKGROUND_NOTIFICATION_TASK = "BACKGROUND-TASK-SYNC-NOTIFICATION";

/**
 * Data payload shape sent by the `onTaskWritten` Cloud Function.
 */
export interface TaskPushData {
  type:
    | "task-created"
    | "task-completed"
    | "task-deleted"
    | "task-reopened"
    | "task-rescheduled";
  taskId: string;
  title: string;
  dueDate: string;
  dueTime?: string | null;
  recurrence: Task["recurrence"];
}

// Configure default behavior
// Configure default behavior
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () =>
      ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }) as any,
  });
}

/**
 * Serviço de Notificações
 *
 * Responsável por gerenciar notificações push e agendadas
 * Segue o Single Responsibility Principle (SRP)
 */
export const notificationService = {
  /**
   * Configura categorias de notificação com ações
   */
  async setupNotificationCategories(): Promise<void> {
    if (Platform.OS === "web") return; // Notificações não suportadas na web
    try {
      // Define categoria de notificação com ações
      await Notifications.setNotificationCategoryAsync("task-notification", [
        {
          identifier: "complete",
          buttonTitle: "✓ Concluir",
          options: {
            opensAppToForeground: true, // Abre o app para garantir execução
          },
        },
        {
          identifier: "skip",
          buttonTitle: "⏭ Pular",
          options: {
            opensAppToForeground: true, // Abre o app para garantir execução
          },
        },
      ]);
      console.log("[NotificationService] Notification categories configured");
    } catch (error) {
      console.error(
        "[NotificationService] Error setting up categories:",
        error,
      );
    }
  },

  /**
   * Solicita permissões para notificações
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === "web") return false;

    if (Platform.OS === "android") {
      // Channel for general reminders
      await Notifications.setNotificationChannelAsync("default", {
        name: "Notificações de Tarefas",
        description: "Lembretes de tarefas e alertas",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#5271FF",
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        bypassDnd: false,
      });

      // Dedicated channel for due/overdue alerts (highest priority)
      await Notifications.setNotificationChannelAsync("due-high-priority", {
        name: "Tarefas Vencendo/Vencidas",
        description: "Alertas de vencimento com alta prioridade",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 300, 200, 300],
        lightColor: "#FF3B30",
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        bypassDnd: true,
      });
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // Setup notification categories after permissions
    if (finalStatus === "granted") {
      await this.setupNotificationCategories();
    }

    return finalStatus === "granted";
  },

  /**
   * Agenda notificações para uma tarefa
   */
  async scheduleTaskNotifications(task: Task): Promise<string[]> {
    // Skip notifications on web platform
    if (Platform.OS === "web") {
      return [];
    }

    // Defensive deduplication: clear any existing scheduled notifications for this task
    await this.cancelScheduledNotificationsByTask(task.id);

    // Skip deleted tasks
    if (task.deletedAt) {
      console.log(
        "[NotificationService] Skipping notifications for deleted task:",
        task.id,
      );
      return [];
    }

    // A completed occurrence must never keep reminders. Recurring tasks create a
    // separate, pending occurrence, so the historical completed record is also
    // ineligible for notifications.
    if (task.completed) {
      console.log(
        "[NotificationService] Skipping notifications for completed task:",
        task.id,
      );
      return [];
    }

    // Create due date using Brasilia timezone
    const dueDate = createBrasiliaDate(task.dueDate, task.dueTime || undefined);
    const now = new Date();
    const notificationIds: string[] = [];

    // DEBUG: Log timezone info
    console.log(
      "[NotificationService] Scheduling notifications for task:",
      task.title,
    );
    console.log(
      "[NotificationService] Task dueDate:",
      task.dueDate,
      "dueTime:",
      task.dueTime,
    );
    console.log(
      "[NotificationService] Parsed date (Brasilia):",
      formatBrasiliaDateTime(dueDate),
    );
    console.log(
      "[NotificationService] Current time (Brasilia):",
      formatBrasiliaDateTime(now),
    );
    console.log(
      "[NotificationService] Time until due (seconds):",
      secondsUntilDate(dueDate),
    );

    // Validations
    if (isNaN(dueDate.getTime())) return [];

    // Helper to schedule
    const schedule = async (
      triggerDate: Date,
      title: string,
      body: string,
      notificationType: "due" | "one_hour" | "twelve_hours",
      priority: keyof typeof Notifications.AndroidNotificationPriority,
      channelId: string,
    ) => {
      if (triggerDate <= now) {
        console.log(
          "[NotificationService] Skipping past notification:",
          title,
          "trigger:",
          triggerDate.toLocaleString("pt-BR"),
        );
        return; // Don't schedule in past
      }

      try {
        const secondsUntilTrigger = Math.floor(
          (triggerDate.getTime() - now.getTime()) / 1000,
        );

        console.log(
          "[NotificationService] Scheduling:",
          title,
          "in",
          secondsUntilTrigger,
          "seconds",
        );

        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: true,
            priority: Notifications.AndroidNotificationPriority[priority],
            data: {
              taskId: task.id,
              taskTitle: task.title,
              notificationType,
            },
            categoryIdentifier: "task-notification", // Enable action buttons
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsUntilTrigger,
            channelId,
          },
        });
        notificationIds.push(id);
      } catch (error) {
        console.error(
          "[NotificationService] Error scheduling notification:",
          error,
        );
      }
    };

    // 1. Exact Time
    await schedule(
      dueDate,
      "Tarefa Vencida",
      `A tarefa "${task.title}" venceu agora!`,
      "due",
      "MAX",
      "due-high-priority",
    );

    // 2. 1 Hour Before
    const oneHourBefore = new Date(dueDate);
    oneHourBefore.setHours(oneHourBefore.getHours() - 1);
    await schedule(
      oneHourBefore,
      "Tarefa em 1 hora",
      `A tarefa "${task.title}" vence em 1 hora.`,
      "one_hour",
      "HIGH",
      "default",
    );

    // 3. 12 Hours Before
    const twelveHoursBefore = new Date(dueDate);
    twelveHoursBefore.setHours(twelveHoursBefore.getHours() - 12);
    await schedule(
      twelveHoursBefore,
      "Lembrete de Tarefa",
      `A tarefa "${task.title}" vence em 12 horas.`,
      "twelve_hours",
      "HIGH",
      "default",
    );

    return notificationIds;
  },

  async cancelScheduledNotificationsByTask(taskId?: string): Promise<void> {
    if (Platform.OS === "web") return;
    if (!taskId) return;

    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();

      for (const notification of scheduled) {
        const notificationTaskId = (notification as any)?.content?.data?.taskId;
        if (notificationTaskId === taskId) {
          await Notifications.cancelScheduledNotificationAsync(
            notification.identifier,
          );
        }
      }
    } catch (error) {
      console.error(
        "[NotificationService] Error deduplicating notifications for task:",
        taskId,
        error,
      );
    }
  },

  /**
   * Cancela notificações de uma tarefa
   */
  async cancelTaskNotifications(
    notificationIds?: string[],
    taskId?: string,
  ): Promise<void> {
    if (Platform.OS === "web") return;

    const ids = new Set(notificationIds || []);

    // The IDs live in local state and can be briefly stale (for example when a
    // task is completed immediately after creation or after an app restart).
    // Recover the actual IDs from the OS using the taskId embedded at schedule
    // time, making cancellation independent from store timing.
    if (taskId) {
      try {
        const scheduled =
          await Notifications.getAllScheduledNotificationsAsync();
        for (const notification of scheduled) {
          const notificationTaskId = (notification as any)?.content?.data
            ?.taskId;
          if (notificationTaskId === taskId) {
            ids.add(notification.identifier);
          }
        }
      } catch (error) {
        console.error(
          "[NotificationService] Error finding notifications for task:",
          taskId,
          error,
        );
      }
    }

    for (const id of ids) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {
        console.log(
          "[NotificationService] Notification ID might not exist:",
          id,
        );
      }
    }
  },

  /**
   * Cancela todas as notificações agendadas
   */
  async cancelAll(): Promise<void> {
    if (Platform.OS === "web") return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  /**
   * Retorna todas as notificações agendadas (para debug)
   */
  async getScheduledNotifications(): Promise<
    Notifications.NotificationRequest[]
  > {
    if (Platform.OS === "web") return [];
    return await Notifications.getAllScheduledNotificationsAsync();
  },

  /**
   * Obtém o Expo Push Token deste dispositivo, usado pelas Cloud Functions
   * para enviar atualizações em background sobre tarefas compartilhadas.
   * Retorna null se não for possível obter (web, emulador sem Google Play, etc).
   */
  async registerForPushNotificationsAsync(): Promise<string | null> {
    if (Platform.OS === "web") return null;

    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") return null;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.warn("[NotificationService] Missing EAS projectId for push token");
        return null;
      }

      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      console.log("[NotificationService] Expo push token obtained");
      return token;
    } catch (error) {
      console.error("[NotificationService] Error getting push token:", error);
      return null;
    }
  },

  /**
   * Reconcilia as notificações locais deste dispositivo a partir do payload
   * de um push recebido (em background ou primeiro plano). Não depende do
   * estado da store/Firestore - usa só os dados que vieram na notificação,
   * para funcionar mesmo com o app fechado.
   */
  async reconcileFromPushData(data: TaskPushData): Promise<void> {
    if (!data?.taskId || !data?.type) return;

    console.log("[NotificationService] Reconciling from push data:", data);

    switch (data.type) {
      case "task-completed":
      case "task-deleted":
        await this.cancelScheduledNotificationsByTask(data.taskId);
        break;

      case "task-created":
      case "task-reopened":
      case "task-rescheduled": {
        const fakeTask: Task = {
          id: data.taskId,
          title: data.title,
          description: "",
          dueDate: data.dueDate,
          dueTime: data.dueTime || undefined,
          category: "",
          completed: false,
          recurrence: data.recurrence,
          subtasks: [],
          createdAt: "",
          updatedAt: "",
        };
        await this.scheduleTaskNotifications(fakeTask);
        break;
      }
    }
  },

  /**
   * Reagenda notificações para todas as tarefas pendentes
   * Deve ser chamado quando o app inicia para garantir que as notificações existam
   */
  async rescheduleAllNotifications(
    tasks: Task[],
  ): Promise<Record<string, string[]>> {
    // Skip on web
    if (Platform.OS === "web") {
      return {};
    }

    console.log(
      "[NotificationService] Rescheduling notifications for",
      tasks.length,
      "tasks",
    );

    // First, cancel all existing notifications to avoid duplicates
    await this.cancelAll();

    const notificationMap: Record<string, string[]> = {};

    for (const task of tasks) {
      // Completed records (including completed recurring occurrences) never
      // receive reminders. A recurrence is represented by a new pending task.
      if (task.completed) {
        continue;
      }

      // Skip deleted tasks
      if (task.deletedAt) {
        continue;
      }

      try {
        const ids = await this.scheduleTaskNotifications(task);
        if (ids.length > 0) {
          notificationMap[task.id] = ids;
          console.log(
            "[NotificationService] Scheduled",
            ids.length,
            "notifications for task:",
            task.title,
          );
        }
      } catch (error) {
        console.error(
          "[NotificationService] Error scheduling notifications for task:",
          task.id,
          error,
        );
      }
    }

    console.log(
      "[NotificationService] Total tasks with notifications:",
      Object.keys(notificationMap).length,
    );

    // Debug: Log all scheduled notifications
    const scheduled = await this.getScheduledNotifications();
    console.log(
      "[NotificationService] Total scheduled notifications:",
      scheduled.length,
    );

    return notificationMap;
  },
};

export default notificationService;
