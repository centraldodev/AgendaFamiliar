import { registerRootComponent } from 'expo';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import App from './App';
import { BACKGROUND_NOTIFICATION_TASK, notificationService, registerBackgroundSync } from './src/firebase';

// Handles push notifications sent by the Cloud Function whenever a family
// member changes a shared task, even while the app is closed/killed - this
// keeps local notifications in sync without requiring the user to open the app.
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, ({ data, error }) => {
  if (error) {
    console.error('[BackgroundNotificationTask] Error:', error);
    return;
  }
  const pushData = data?.notification?.request?.content?.data;
  if (pushData) {
    notificationService.reconcileFromPushData(pushData).catch((e) => {
      console.error('[BackgroundNotificationTask] Reconcile failed:', e);
    });
  }
});

if (Platform.OS !== 'web') {
  Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch((error) => {
    console.warn('[BackgroundNotificationTask] Could not register task:', error);
  });

  // Free-tier fallback: periodically pull tasks from Firestore in the
  // background and resync local notifications (no Cloud Functions/Blaze needed)
  registerBackgroundSync();
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
