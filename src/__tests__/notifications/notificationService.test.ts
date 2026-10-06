/**
 * Testes para Notification Service
 *
 * Testa agendamento, cancelamento e reagendamento de notificações
 */
import { notificationService } from "@src/firebase/services/notifications/notificationService";
import type { Task } from "@types";
import * as Notifications from "expo-notifications";

// Mock expo-notifications
jest.mock("expo-notifications");

// Mock dateUtils
jest.mock("@utils/dateUtils", () => ({
  createBrasiliaDate: (dateStr: string, timeStr?: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hours, minutes] = timeStr ? timeStr.split(":").map(Number) : [9, 0];
    return new Date(year, month - 1, day, hours, minutes);
  },
  formatBrasiliaDateTime: (date: Date) => date.toLocaleString("pt-BR"),
  secondsUntilDate: (date: Date) =>
    Math.floor((date.getTime() - Date.now()) / 1000),
}));

// Get mock functions
const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock;
const mockCancel = Notifications.cancelScheduledNotificationAsync as jest.Mock;
const mockCancelAll =
  Notifications.cancelAllScheduledNotificationsAsync as jest.Mock;
const mockGetAll = Notifications.getAllScheduledNotificationsAsync as jest.Mock;

// Base task for testing
const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: "task-123",
  title: "Test Task",
  description: "Test description",
  dueDate: getFutureDate(1), // Tomorrow
  dueTime: "14:00",
  category: "work",
  recurrence: "none",
  completed: false,
  familyId: "family-1",
  createdBy: "user-1",
  isPrivate: false,
  subtasks: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// Helper to get future date string
function getFutureDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("Notification Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSchedule.mockResolvedValue("notification-id-1");
    mockGetAll.mockResolvedValue([]);
  });

  describe("scheduleTaskNotifications", () => {
    it("should schedule notifications for a future task", async () => {
      const task = createMockTask();

      const ids = await notificationService.scheduleTaskNotifications(task);

      // Should schedule multiple notifications (exact time, 1h before, 12h before)
      expect(mockSchedule).toHaveBeenCalled();
      expect(ids.length).toBeGreaterThan(0);
    });

    it("should NOT schedule for completed non-recurring task", async () => {
      const task = createMockTask({ completed: true, recurrence: "none" });

      const ids = await notificationService.scheduleTaskNotifications(task);

      expect(ids).toHaveLength(0);
      expect(mockSchedule).not.toHaveBeenCalled();
    });

    it("should NOT schedule a completed recurring occurrence", async () => {
      const task = createMockTask({ completed: true, recurrence: "daily" });

      const ids = await notificationService.scheduleTaskNotifications(task);

      expect(ids).toHaveLength(0);
      expect(mockSchedule).not.toHaveBeenCalled();
    });

    it("should NOT schedule for deleted task", async () => {
      const task = createMockTask({ deletedAt: new Date().toISOString() });

      const ids = await notificationService.scheduleTaskNotifications(task);

      expect(ids).toHaveLength(0);
      expect(mockSchedule).not.toHaveBeenCalled();
    });

    it("should schedule with correct content", async () => {
      const task = createMockTask({ title: "Important Meeting" });

      await notificationService.scheduleTaskNotifications(task);

      expect(mockSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            data: expect.objectContaining({
              taskId: task.id,
              taskTitle: task.title,
            }),
          }),
        }),
      );
    });

    it("should use high-priority channel for due notification", async () => {
      const task = createMockTask();

      await notificationService.scheduleTaskNotifications(task);

      const firstCall = mockSchedule.mock.calls[0]?.[0];

      expect(firstCall.content.priority).toBe(
        Notifications.AndroidNotificationPriority.MAX,
      );
      expect(firstCall.trigger.channelId).toBe("due-high-priority");
      expect(firstCall.content.data.notificationType).toBe("due");
    });

    it("should cancel existing scheduled notifications for the same task before scheduling", async () => {
      const task = createMockTask();
      mockGetAll.mockResolvedValue([
        {
          identifier: "existing-same-task",
          content: { data: { taskId: task.id } },
        },
        {
          identifier: "existing-other-task",
          content: { data: { taskId: "other-task" } },
        },
      ] as any);

      await notificationService.scheduleTaskNotifications(task);

      expect(mockCancel).toHaveBeenCalledWith("existing-same-task");
      expect(mockCancel).not.toHaveBeenCalledWith("existing-other-task");
    });
  });

  describe("cancelTaskNotifications", () => {
    it("should cancel notifications by IDs", async () => {
      const notificationIds = ["notif-1", "notif-2", "notif-3"];

      await notificationService.cancelTaskNotifications(notificationIds);

      expect(mockCancel).toHaveBeenCalledTimes(3);
      expect(mockCancel).toHaveBeenCalledWith("notif-1");
      expect(mockCancel).toHaveBeenCalledWith("notif-2");
      expect(mockCancel).toHaveBeenCalledWith("notif-3");
    });

    it("should handle empty array gracefully", async () => {
      await notificationService.cancelTaskNotifications([]);

      expect(mockCancel).not.toHaveBeenCalled();
    });

    it("should handle undefined gracefully", async () => {
      await notificationService.cancelTaskNotifications(undefined);

      expect(mockCancel).not.toHaveBeenCalled();
    });

    it("should find and cancel notifications by task ID when local IDs are stale", async () => {
      mockGetAll.mockResolvedValue([
        {
          identifier: "scheduled-for-task",
          content: { data: { taskId: "task-123" } },
        },
        {
          identifier: "scheduled-for-other-task",
          content: { data: { taskId: "other-task" } },
        },
      ] as any);

      await notificationService.cancelTaskNotifications([], "task-123");

      expect(mockCancel).toHaveBeenCalledWith("scheduled-for-task");
      expect(mockCancel).not.toHaveBeenCalledWith(
        "scheduled-for-other-task",
      );
    });

    it("should not cancel the same notification twice", async () => {
      mockGetAll.mockResolvedValue([
        {
          identifier: "notif-1",
          content: { data: { taskId: "task-123" } },
        },
      ] as any);

      await notificationService.cancelTaskNotifications(
        ["notif-1"],
        "task-123",
      );

      expect(mockCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe("cancelAll", () => {
    it("should cancel all scheduled notifications", async () => {
      await notificationService.cancelAll();

      expect(mockCancelAll).toHaveBeenCalledTimes(1);
    });
  });

  describe("rescheduleAllNotifications", () => {
    it("should cancel all and reschedule for each task", async () => {
      const tasks = [
        createMockTask({ id: "task-1", title: "Task 1" }),
        createMockTask({ id: "task-2", title: "Task 2" }),
      ];

      const result =
        await notificationService.rescheduleAllNotifications(tasks);

      expect(mockCancelAll).toHaveBeenCalledTimes(1);
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });

    it("should skip completed and deleted tasks", async () => {
      const tasks = [
        createMockTask({ id: "task-1", completed: true, recurrence: "daily" }),
        createMockTask({ id: "task-2", deletedAt: new Date().toISOString() }),
        createMockTask({ id: "task-3", title: "Valid Task" }),
      ];
      mockSchedule.mockClear();

      await notificationService.rescheduleAllNotifications(tasks);

      // Only task-3 should be scheduled
      expect(mockSchedule).toHaveBeenCalled();
    });
  });
});
