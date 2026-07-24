import { useThemeColors } from '@hooks/useThemeColors';
import RootNavigator from '@navigation/RootNavigator';
import SplashScreen from '@screens/SplashScreen';
import { auth, authService, notificationService, taskService, userService } from '@src/firebase';
import { useCategoryStore } from '@store/categoryStore';
import { useFamilyMembersStore } from '@store/familyMembersStore';
import { useTaskStore } from '@store/taskStore';
import { useUserStore } from '@store/userStore';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import i18n from 'i18next';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import './src/config/i18n';

export default function App() {
  const { width } = useWindowDimensions();
  const [isLoading, setIsLoading] = useState(true);
  const setUser = useUserStore((state) => state.setUser);
  const loadPreferences = useUserStore((state) => state.loadPreferences);
  const user = useUserStore((state) => state.user);
  const preferences = useUserStore((state) => state.preferences);
  const colors = useThemeColors();
  const initializeTasks = useTaskStore((state) => state.initialize);
  const initializeCategories = useCategoryStore((state) => state.initialize);
  const cleanupCategories = useCategoryStore((state) => state.cleanup);
  const initializeFamilyMembers = useFamilyMembersStore((state) => state.initialize);
  const cleanupFamilyMembers = useFamilyMembersStore((state) => state.cleanup);

  // Responsividade WEB: Usando state para garantir consistência na hidratação
  const [webContainerStyle, setWebContainerStyle] = useState<any>({ flex: 1 });

  useEffect(() => {
    if (Platform.OS === 'web') {
      const isLargeScreen = width >= 1024;
      setWebContainerStyle({
        maxWidth: isLargeScreen ? '70%' : '100%',
        width: '100%',
        alignSelf: 'center',
        minHeight: isLargeScreen ? '100vh' : '100%',
        backgroundColor: colors.background,
      });
    }
  }, [width, colors.background]);

  useEffect(() => {
    // Load saved preferences first
    loadPreferences();

    // Listen to Firebase Auth state changes
    console.log('[App] Setting up auth state listener...');
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: any) => {
      console.log('[App] Auth state changed:', firebaseUser ? `User: ${firebaseUser.email}` : 'No user');

      if (firebaseUser) {
        // User is signed in
        try {
          const user = await authService.getUserData(firebaseUser);
          console.log('[App] User data loaded:', user.email, 'FamilyID:', user.familyId);
          setUser(user);
        } catch (error) {
          console.error('[App] Error loading user data:', error);
          setUser(null);
        }
      } else {
        // User is signed out
        console.log('[App] User signed out');
        setUser(null);
      }

      // Finaliza o loading após verificar autenticação
      setIsLoading(false);
    });

    // Request notification permissions
    const setupNotifications = async () => {
      const granted = await notificationService.requestPermissions();
      console.log('[App] Notification permissions:', granted ? 'granted' : 'denied');

      if (!granted) {
        console.warn('[App] Notifications will not work without permissions!');
      }

      // Debug: Check scheduled notifications
      const scheduled = await notificationService.getScheduledNotifications();
      console.log('[App] Currently scheduled notifications:', scheduled.length);
    };
    setupNotifications();

    return () => {
      console.log('[App] Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user?.familyId) {
      const unsubscribe = initializeTasks();
      initializeCategories(user.familyId);
      initializeFamilyMembers(user.familyId);

      return () => {
        unsubscribe();
        cleanupCategories();
        cleanupFamilyMembers();
      };
    }
  }, [user?.familyId]);

  // Register this device's push token so the Cloud Function can notify it
  // in background whenever another family member changes a shared task
  useEffect(() => {
    if (!user?.uid) return;

    notificationService.registerForPushNotificationsAsync().then((token) => {
      if (token) {
        userService.addPushToken(user.uid, token);
      }
    });
  }, [user?.uid]);

  // Reconcile local notifications when a background-sync push arrives while
  // the app is in the foreground (the TaskManager task in index.js handles
  // the case where the app is backgrounded/closed)
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as any;
      if (data?.type && data?.taskId) {
        notificationService.reconcileFromPushData(data).catch((error) => {
          console.error('[App] Error reconciling push data:', error);
        });
      }
    });

    return () => subscription.remove();
  }, []);

  // Handle notification actions (Complete/Skip)
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const { actionIdentifier, notification } = response;
      const { taskId, taskTitle } = notification.request.content.data as { taskId: string; taskTitle: string };

      console.log('[App] Notification action:', actionIdentifier, 'for task:', taskId);

      if (!taskId) {
        console.warn('[App] Notification received without taskId');
        return;
      }

      const { toggleTask, skipTask, tasks } = useTaskStore.getState();
      const currentUser = useUserStore.getState().user;

      let task = tasks.find(t => t.id === taskId);

      if (!task) {
        try {
          const fetchedTask = await taskService.getTaskById(taskId);
          if (fetchedTask) {
            task = fetchedTask;
          }
        } catch (error) {
          console.error('[App] Error fetching task from service:', error);
        }
      }

      if (!task) return;

      if (!currentUser) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const retryUser = useUserStore.getState().user;
        if (!retryUser) return;
      }

      try {
        if (actionIdentifier === 'complete') {
          if (!task.completed) {
            await toggleTask(taskId);
          }
        } else if (actionIdentifier === 'skip') {
          if (task.recurrence && task.recurrence !== 'none') {
            await skipTask(taskId);
          }
        }
      } catch (error) {
        console.error('[App] Error handling notification action:', error);
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (preferences.language) {
      i18n.changeLanguage(preferences.language);
    }
  }, [preferences.language]);

  // Update body background color on web
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.body.style.backgroundColor = colors.background;
    }
  }, [colors.background]);

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaProvider>
        <SafeAreaView style={[webContainerStyle, { backgroundColor: colors.background }]} edges={['left', 'right']}>
          <StatusBar style={preferences.theme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.background} />
          {isLoading ? <SplashScreen /> : <RootNavigator />}
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
