import type { Task, User } from "@types";
import { filterVisibleTasks } from "@utils/taskPermissions";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { auth, firestore } from "../../config/firebase.config";
import { notificationService } from "./notificationService";

/**
 * No Firebase Blaze plan there's no server-side push to wake the app when a
 * family member changes a shared task, so this periodic background task is
 * the free-tier fallback: it pulls the family's tasks straight from
 * Firestore every so often (interval is OS-controlled, not guaranteed) and
 * fully re-syncs this device's local notifications from that fresh data.
 */
export const BACKGROUND_SYNC_TASK = "BACKGROUND-FIRESTORE-SYNC-TASK";

function waitForAuthUser(timeoutMs = 8000): Promise<{ uid: string } | null> {
  return new Promise((resolve) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }
    const timeout = setTimeout(() => resolve(auth.currentUser), timeoutMs);
    const unsubscribe = auth.onAuthStateChanged((user: any) => {
      clearTimeout(timeout);
      unsubscribe();
      resolve(user);
    });
  });
}

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const firebaseUser = await waitForAuthUser();
    if (!firebaseUser) {
      console.log("[BackgroundSync] No authenticated user, skipping");
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const userDoc = await firestore.collection("users").doc(firebaseUser.uid).get();
    if (!userDoc.exists) return BackgroundFetch.BackgroundFetchResult.NoData;

    const userData = userDoc.data() as User;
    if (!userData?.familyId) return BackgroundFetch.BackgroundFetchResult.NoData;

    const currentUser: User = { ...userData, uid: firebaseUser.uid };

    const snapshot = await firestore
      .collection("tasks")
      .where("familyId", "==", currentUser.familyId)
      .get();

    const tasks = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
      };
    }) as Task[];

    const visibleTasks = filterVisibleTasks(tasks, currentUser);

    console.log(`[BackgroundSync] Reconciling ${visibleTasks.length} task(s)`);
    await notificationService.rescheduleAllNotifications(visibleTasks);

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("[BackgroundSync] Task failed:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes - the OS decides the actual cadence
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log("[BackgroundSync] Task registered");
  } catch (error) {
    console.error("[BackgroundSync] Error registering task:", error);
  }
}
