import TaskItem from '@components/TaskItem';
import { Ionicons } from '@expo/vector-icons';
import { useLoadingState } from '@hooks/useLoadingState';
import { useThemeColors } from '@hooks/useThemeColors';
import { useFocusEffect } from '@react-navigation/native';
import { useCategoryStore } from '@store/categoryStore';
import { useTaskStore } from '@store/taskStore';
import { useUserStore } from '@store/userStore';
import type { Task } from '@types';
import { getDateDaysAgoString, getTodayString } from '@utils/dateParser';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { TabBar, TabView } from 'react-native-tab-view';
import { createStyles } from './HomeScreen.styles';

export default function HomeScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { tasks, deleteTask, toggleTask, skipTask, toggleSubtask, getTasks } =
    useTaskStore();
  const { categories } = useCategoryStore();
  const user = useUserStore((state) => state.user);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { loading, setLoading, refreshing, setRefreshing } = useLoadingState();

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<Task['category'] | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'overdue' | 'completed'>('pending');

  // Tab navigation state
  const layout = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const routes = useMemo(() => [
    { key: 'today', title: t('tasks.today') },
    { key: 'upcoming', title: t('tasks.upcoming') },
  ], [t]);

  // Drag to scroll for web
  const scrollRef = useRef<ScrollView>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  // Setup drag-to-scroll for web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    // Improved way to get the DOM node in React Native Web
    const scrollNode = scrollRef.current;
    if (!scrollNode) return;

    // @ts-ignore - getScrollableNode exists in React Native Web
    const scrollElement = scrollNode.getScrollableNode ? scrollNode.getScrollableNode() : null;
    if (!scrollElement) return;

    let isDown = false;
    let startXPos: number;
    let scrollLeftPos: number;

    const handleMouseDown = (e: MouseEvent) => {
      isDown = true;
      scrollElement.classList.add('active');
      startXPos = e.pageX - scrollElement.offsetLeft;
      scrollLeftPos = scrollElement.scrollLeft;
      scrollElement.style.cursor = 'grabbing';
      scrollElement.style.userSelect = 'none';
    };

    const handleMouseLeave = () => {
      isDown = false;
      scrollElement.style.cursor = 'grab';
    };

    const handleMouseUp = () => {
      isDown = false;
      scrollElement.style.cursor = 'grab';
      scrollElement.style.userSelect = 'auto';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - scrollElement.offsetLeft;
      const walk = (x - startXPos) * 1; // Increased multiplier for responsiveness
      scrollElement.scrollLeft = scrollLeftPos - walk;
    };

    scrollElement.style.cursor = 'grab';
    scrollElement.addEventListener('mousedown', handleMouseDown);
    scrollElement.addEventListener('mouseleave', handleMouseLeave);
    scrollElement.addEventListener('mouseup', handleMouseUp);
    scrollElement.addEventListener('mousemove', handleMouseMove);

    return () => {
      scrollElement.removeEventListener('mousedown', handleMouseDown);
      scrollElement.removeEventListener('mouseleave', handleMouseLeave);
      scrollElement.removeEventListener('mouseup', handleMouseUp);
      scrollElement.removeEventListener('mousemove', handleMouseMove);
    };
  }, [loading, categories]); // Re-run when loading finishes or categories change

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [])
  );

  const loadTasks = async () => {
    setLoading(true);
    try {
      getTasks();
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert(t('tasks.load_error', 'Não foi possível carregar as tarefas'));
      } else {
        Alert.alert(t('common.error'), t('tasks.load_error', 'Não foi possível carregar as tarefas'));
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await getTasks();
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert(t('tasks.update_error', 'Não foi possível atualizar as tarefas'));
      } else {
        Alert.alert(t('common.error'), t('tasks.update_error', 'Não foi possível atualizar as tarefas'));
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleEditTask = (task: Task) => {
    navigation.navigate('AddEdit', { taskId: task.id });
  };

  const handleDeleteTask = (taskId: string) => {
    // On web, confirm() works better than Alert.alert
    if (Platform.OS === 'web') {
      if (window.confirm(t('tasks.delete_confirm_msg'))) {
        deleteTask(taskId);
      }
      return;
    }

    Alert.alert(
      t('tasks.delete_confirm_title'),
      t('tasks.delete_confirm_msg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => deleteTask(taskId),
        },
      ]
    );
  };

  const handleSkipTask = (taskId: string) => {
    // On web, confirm() works better than Alert.alert
    if (Platform.OS === 'web') {
      if (window.confirm(t('tasks.skip_confirm_msg'))) {
        skipTask(taskId);
      }
      return;
    }

    Alert.alert(
      t('tasks.skip_confirm_title'),
      t('tasks.skip_confirm_msg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('tasks.skip'),
          style: 'default',
          onPress: () => skipTask(taskId),
        },
      ]
    );
  };

  // Get filtered tasks based on current tab
  const getFilteredTasks = useCallback((dateFilter: 'today' | 'upcoming') => {
    return tasks.filter((t) => {
      const todayStr = getTodayString();

      // 0. Exclude deleted tasks
      if (t.deletedAt) return false;

      // Note: Private task filtering is done at the store level (taskStore.initialize)
      // This ensures private tasks never reach the UI layer
      // Defense in depth: tasks array already filtered by taskPermissions.filterVisibleTasks

      // 1. Status Filter
      if (selectedStatus === 'completed') {
        if (!t.completed) return false;
        // Only show completed tasks from last 7 days
        if (t.updatedAt) {
          const sevenDaysAgoStr = getDateDaysAgoString(7);
          const updatedDate = t.updatedAt.split('T')[0];
          if (updatedDate < sevenDaysAgoStr) return false;
        }
      } else if (selectedStatus === 'overdue') {
        if (t.completed) return false;
        if (t.dueDate >= todayStr) return false;
      } else { // pending
        if (t.completed) return false;
        if (t.dueDate < todayStr) return false;
      }

      // 2. Category Filter
      if (selectedCategory && t.category !== selectedCategory) return false;

      // 3. Date Filter - Only apply when status is pending
      if (selectedStatus === 'pending') {
        if (dateFilter === 'today') {
          const isOverdue = t.dueDate < todayStr && !t.completed;
          if (t.dueDate !== todayStr && !isOverdue) return false;
        } else if (dateFilter === 'upcoming') {
          if (t.dueDate <= todayStr) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Sort by date: nearest first
      return a.dueDate.localeCompare(b.dueDate);
    });
  }, [tasks, selectedStatus, selectedCategory]);

  const todayTasks = useMemo(() => getFilteredTasks('today'), [getFilteredTasks]);
  const upcomingTasks = useMemo(() => getFilteredTasks('upcoming'), [getFilteredTasks]);

  // Calculate counts for status buttons using LOCAL timezone
  const todayStr = getTodayString();
  const currentDateFilter: 'today' | 'upcoming' = index === 0 ? 'today' : 'upcoming';
  const sevenDaysAgoStr = getDateDaysAgoString(7);

  // Completed: only tasks completed in the last 7 days
  const completedCount = tasks.filter((t) => {
    if (!t.completed || t.deletedAt) return false;
    // Check if task was completed in the last 7 days
    if (t.updatedAt) {
      const updatedDate = t.updatedAt.split('T')[0];
      return updatedDate >= sevenDaysAgoStr;
    }
    return true; // Include if no updatedAt (legacy tasks)
  }).length;

  // Pending: reflects current tab/date filter and selected category
  const pendingCount = tasks.filter((t) => {
    if (t.deletedAt || t.completed) return false;

    if (selectedCategory && t.category !== selectedCategory) return false;

    const pendingDateFilter: 'today' | 'upcoming' =
      selectedStatus === 'pending' ? currentDateFilter : 'today';

    if (pendingDateFilter === 'today') {
      // Matches the "Today" tab, which also folds in active overdue tasks
      return t.dueDate <= todayStr;
    }

    return t.dueDate > todayStr;
  }).length;

  // Overdue: active tasks (not deleted, not completed) with past date
  const overdueCount = tasks.filter(t =>
    !t.completed && !t.deletedAt && t.dueDate < todayStr
  ).length;

  const statusTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (t.deletedAt) return false;
        if (selectedCategory && t.category !== selectedCategory) return false;

        if (selectedStatus === 'overdue') {
          return !t.completed && t.dueDate < todayStr;
        }

        if (selectedStatus === 'completed') {
          if (!t.completed) return false;
          if (t.updatedAt) {
            const updatedDate = t.updatedAt.split('T')[0];
            return updatedDate >= sevenDaysAgoStr;
          }
          return true;
        }

        return false;
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [tasks, selectedStatus, selectedCategory, todayStr, sevenDaysAgoStr]);

  // Render task list for a tab
  const renderTaskList = (taskList: Task[], emptySubText?: string) => (
    <FlatList
      data={taskList}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TaskItem
          task={item}
          onPress={handleEditTask}
          onToggle={toggleTask}
          onSkip={handleSkipTask}
          onSubtaskToggle={toggleSubtask}
          onDelete={handleDeleteTask}
        />
      )}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-done-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {t('tasks.no_tasks')}
          </Text>
          {emptySubText ? (
            <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
              {emptySubText}
            </Text>
          ) : null}
        </View>
      }
    />
  );

  // Tab scenes
  // NOTE: intentionally NOT using react-native-tab-view's SceneMap() here.
  // SceneMap wraps each route in `React.createElement(component, ...)` where
  // `component` is whatever function you pass it - if that function is
  // redefined on every render (as it would be if it closed over todayTasks/
  // upcomingTasks inline), React treats it as a brand new component type and
  // remounts the whole scene (FlatList + every TaskItem) on every store
  // update, wiping out each TaskItem's local "subtasks expanded" state.
  // renderScene is called directly by TabView (not used as a JSX type), so
  // returning JSX from a plain switch here is safe from that trap.
  const renderScene = ({ route }: { route: { key: string } }) => {
    switch (route.key) {
      case 'today':
        return renderTaskList(todayTasks);
      case 'upcoming':
        return renderTaskList(upcomingTasks);
      default:
        return null;
    }
  };

  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      indicatorStyle={{ backgroundColor: colors.primary, height: 3 }}
      style={{ 
        backgroundColor: colors.background, 
        elevation: 0, 
        shadowOpacity: 0, 
        borderBottomWidth: 0,
        borderWidth: 0,
        borderTopWidth: 0,
      }}
      labelStyle={{ fontWeight: '600', textTransform: 'none', fontSize: 16 }}
      activeColor={colors.primary}
      inactiveColor={colors.textSecondary}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Status Tabs */}
      <View style={styles.statsContainer}>
        {/* Pending */}
        <TouchableOpacity
          style={[
            styles.statBox,
            {
              backgroundColor: selectedStatus === 'pending' ? colors.primary : colors.surface,
            },
          ]}
          onPress={() => setSelectedStatus('pending')}
        >
          <Text
            style={[
              styles.statNumber,
              { color: selectedStatus === 'pending' ? '#FFF' : colors.text },
            ]}
          >
            {pendingCount}
          </Text>
          <Text
            style={[
              styles.statLabel,
              { color: selectedStatus === 'pending' ? '#FFF' : colors.textSecondary },
            ]}
          >
            {t('tasks.pending')}
          </Text>
        </TouchableOpacity>

        {/* Overdue */}
        <TouchableOpacity
          style={[
            styles.statBox,
            {
              backgroundColor: selectedStatus === 'overdue' ? colors.danger : colors.surface,
            },
          ]}
          onPress={() => setSelectedStatus('overdue')}
        >
          <Text
            style={[
              styles.statNumber,
              { color: selectedStatus === 'overdue' ? '#FFF' : colors.text },
            ]}
          >
            {overdueCount}
          </Text>
          <Text
            style={[
              styles.statLabel,
              { color: selectedStatus === 'overdue' ? '#FFF' : colors.textSecondary },
            ]}
          >
            {t('tasks.overdue')}
          </Text>
        </TouchableOpacity>

        {/* Completed */}
        <TouchableOpacity
          style={[
            styles.statBox,
            {
              backgroundColor: selectedStatus === 'completed' ? colors.success : colors.surface,
            },
          ]}
          onPress={() => setSelectedStatus('completed')}
        >
          <Text
            style={[
              styles.statNumber,
              { color: selectedStatus === 'completed' ? '#FFF' : colors.text },
            ]}
          >
            {completedCount}
          </Text>
          <Text
            style={[
              styles.statLabel,
              { color: selectedStatus === 'completed' ? '#FFF' : colors.textSecondary },
            ]}
          >
            {t('tasks.completed')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <View style={styles.filterContainer}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
          style={Platform.OS === 'web' ? { flexGrow: 0 } : undefined}
        >
          {[{ id: null, label: t('common.all'), value: null, color: colors.primary, icon: 'layers-outline' }, ...categories].map((item) => {
            const color = item.color || colors.primary;
            const icon = item.icon || 'layers-outline';
            const isSelected = selectedCategory === item.id;

            return (
              <TouchableOpacity
                key={item.id || 'all'}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? color : colors.surface,
                    borderColor: color,
                  },
                ]}
                onPress={() => setSelectedCategory(item.id)}
              >
                <Ionicons
                  name={icon as any}
                  size={16}
                  color={isSelected ? '#FFF' : color}
                />
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: isSelected ? '#FFF' : colors.text,
                      marginLeft: 6,
                    },
                  ]}
                >
                  {t(`categories.${item.id}`, { defaultValue: item.label })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Task List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : selectedStatus === 'pending' ? (
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          renderTabBar={renderTabBar}
          onIndexChange={setIndex}
          initialLayout={{ width: layout.width }}
        />
      ) : (
        renderTaskList(
          statusTasks,
          selectedStatus === 'overdue'
            ? t('tasks.overdue')
            : t('tasks.completed')
        )
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddEdit')}
        accessibilityLabel={t('tasks.add_task', 'Adicionar tarefa')}
        accessibilityRole="button"
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}
