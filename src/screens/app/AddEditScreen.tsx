import { CreateCategoryModal } from '@components/CreateCategoryModal';
import PickerModal from '@components/PickerModal';
import { TaskBasicInfo } from '@components/task-form/TaskBasicInfo';
import { TaskDateTime } from '@components/task-form/TaskDateTime';
import { TaskSubtasks } from '@components/task-form/TaskSubtasks';
import { WeekDaysPicker } from '@components/task-form/WeekDaysPicker';
import { RECURRENCE_LABELS } from '@constants/task';
import { Ionicons } from '@expo/vector-icons';
import { useTaskForm } from '@hooks/useTaskForm';
import { useThemeColors } from '@hooks/useThemeColors';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCategoryStore } from '@store/categoryStore';
import { useUserStore } from '@store/userStore';
import { borderRadius, cardShadow, fontSize, fontWeight, spacing } from '@styles/spacing';
import type { RecurrenceType } from '@types';
import { getCategoryColor, getCategoryIcon, getCategoryLabel } from '@utils/taskUtils';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const getRecurrenceOptions = (t: any) => [
  { label: t('recurrence.none'), value: 'none' },
  { label: t('recurrence.daily'), value: 'daily' },
  { label: t('recurrence.weekly'), value: 'weekly' },
  { label: t('recurrence.monthly'), value: 'monthly' },
  { label: t('recurrence.yearly'), value: 'yearly' },
  { label: t('recurrence.custom_weekly', { defaultValue: 'Personalizado' }), value: 'custom_weekly' },
];

export default function AddEditScreen({ route, navigation }: any) {
  const { t } = useTranslation();
  const { taskId, initialDate } = route.params || { taskId: null, initialDate: null };
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const user = useUserStore((state) => state.user);
  const { categories, addCategory } = useCategoryStore();
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showRecurrencePicker, setShowRecurrencePicker] = useState(false);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const {
    title,
    description,
    dueDate,
    dueTime,
    category,
    recurrence,
    subtasks,
    isPrivate,
    loading,
    setTitle,
    setDescription,
    setDueDate,
    setDueTime,
    setCategory,
    setRecurrence,
    setIsPrivate,
    weekDays,
    setWeekDays,
    hasEndDate,
    setHasEndDate,
    recurrenceEndDate,
    setRecurrenceEndDate,
    handleSave,
    addSubtask,
    removeSubtask,
  } = useTaskForm({
    taskId,
    initialDate,
    onSuccess: () => navigation.goBack(),
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.headerButton, { backgroundColor: colors.backgroundSecondary }]}
          accessibilityLabel={t('common.cancel')}
          accessibilityRole="button"
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {taskId ? t('tasks.edit_task') : t('tasks.add_task')}
        </Text>
        <View style={styles.headerRightGroup}>
          {user?.familyId && (
            <TouchableOpacity
              onPress={() => setIsPrivate(!isPrivate)}
              style={[
                styles.headerButton,
                { backgroundColor: isPrivate ? colors.primary : colors.backgroundSecondary },
              ]}
              accessibilityLabel={
                isPrivate
                  ? t('tasks.private_task_on', 'Tarefa privada ativada')
                  : t('tasks.private_task_off', 'Tarefa privada desativada')
              }
              accessibilityRole="switch"
              accessibilityState={{ checked: isPrivate }}
            >
              <Ionicons
                name={isPrivate ? 'lock-closed' : 'lock-open-outline'}
                size={20}
                color={isPrivate ? '#FFF' : colors.textSecondary}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleSave}
            style={[
              styles.saveButton,
              { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 },
            ]}
            disabled={loading}
            accessibilityLabel={t('common.save')}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="checkmark" size={22} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Title and Description */}
        <TaskBasicInfo
          title={title}
          description={description}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
        />

        {/* 2. Subtasks - Right after description for better UX */}
        <TaskSubtasks
          subtasks={subtasks}
          onAdd={addSubtask}
          onRemove={removeSubtask}
        />

        {/* 3. Date and Time */}
        <TaskDateTime
          dueDate={dueDate}
          dueTime={dueTime}
          onDateChange={setDueDate}
          onTimeChange={setDueTime}
        />

        {/* 4. Category Selection */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('tasks.category')}
            <Text style={{ color: colors.danger }}> *</Text>
          </Text>
          <TouchableOpacity
            style={[styles.selectorButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
            onPress={() => setShowCategoryPicker(true)}
          >
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: getCategoryColor(category, categories) },
              ]}
            >
              <Ionicons name={getCategoryIcon(category, categories) as any} size={16} color="#FFF" />
            </View>
            <Text style={[styles.selectorText, { color: colors.text }]}>
              {getCategoryLabel(category, categories)}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* 5. Recurrence Selection */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('tasks.recurrence')}</Text>
          <TouchableOpacity
            style={[styles.selectorButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
            onPress={() => setShowRecurrencePicker(true)}
          >
            <View style={[styles.iconBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="repeat-outline" size={16} color="#FFF" />
            </View>
            <Text style={[styles.selectorText, { color: colors.text }]}>
              {t(`recurrence.${recurrence}`, { defaultValue: RECURRENCE_LABELS[recurrence] })}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Show WeekDaysPicker when custom_weekly is selected */}
          {recurrence === 'custom_weekly' && (
            <WeekDaysPicker
              selectedDays={weekDays}
              onDaysChange={setWeekDays}
            />
          )}

          {/* Recurrence End Date */}
          {recurrence !== 'none' && (
            <View style={styles.endDateContainer}>
              <View style={[styles.settingsRow, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={styles.settingsRowLeft}>
                  <View style={[styles.iconBadge, { backgroundColor: colors.primary }]}>
                    <Ionicons name="calendar-outline" size={16} color="#FFF" />
                  </View>
                  <Text style={[styles.settingsRowLabel, { color: colors.text }]}>
                    {t('tasks.ends_on')}
                  </Text>
                </View>
                <Switch
                  value={hasEndDate}
                  onValueChange={(value) => {
                    setHasEndDate(value);
                    if (value && !recurrenceEndDate) {
                      const defaultEnd = new Date();
                      defaultEnd.setMonth(defaultEnd.getMonth() + 1);
                      setRecurrenceEndDate(defaultEnd);
                    }
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFF"
                />
              </View>
              {hasEndDate && (
                Platform.OS === 'web' ? (
                  <View style={[styles.endDateButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                    <input
                      type="date"
                      value={recurrenceEndDate
                        ? `${recurrenceEndDate.getFullYear()}-${(recurrenceEndDate.getMonth() + 1).toString().padStart(2, '0')}-${recurrenceEndDate.getDate().toString().padStart(2, '0')}`
                        : ''
                      }
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => {
                        if (e.target.value) {
                          const [y, m, d] = e.target.value.split('-').map(Number);
                          setRecurrenceEndDate(new Date(y, m - 1, d));
                        }
                      }}
                      style={{
                        flex: 1,
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: colors.text,
                        fontSize: 16,
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.endDateButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Text style={[styles.endDateText, { color: colors.text }]}>
                      {recurrenceEndDate
                        ? `${recurrenceEndDate.getDate().toString().padStart(2, '0')}/${(recurrenceEndDate.getMonth() + 1).toString().padStart(2, '0')}/${recurrenceEndDate.getFullYear()}`
                        : t('tasks.select_date')
                      }
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )
              )}
              {showEndDatePicker && Platform.OS !== 'web' && (
                <DateTimePicker
                  value={recurrenceEndDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={new Date()}
                  onChange={(event, date) => {
                    setShowEndDatePicker(Platform.OS === 'ios');
                    if (date) setRecurrenceEndDate(date);
                  }}
                />
              )}
            </View>
          )}
        </View>

      </ScrollView>

      {/* Modals */}
      <PickerModal
        visible={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        title={t('tasks.select_category')}
        options={categories.map(cat => ({
          value: cat.id,
          label: t(`categories.${cat.id}`, { defaultValue: cat.label }),
          color: cat.color,
          icon: cat.icon,
        }))}
        selectedValue={category}
        onSelect={(value: string) => {
          setCategory(value);
        }}
        onCreate={() => setShowCreateCategoryModal(true)}
      />

      <PickerModal
        visible={showRecurrencePicker}
        onClose={() => setShowRecurrencePicker(false)}
        title={t('tasks.select_recurrence')}
        options={getRecurrenceOptions(t)}
        selectedValue={recurrence}
        onSelect={(value: string) => {
          setRecurrence(value as RecurrenceType);
        }}
      />

      <CreateCategoryModal
        visible={showCreateCategoryModal}
        onClose={() => setShowCreateCategoryModal(false)}
        onSave={(name, icon, color) => {
          if (user?.familyId) {
            addCategory(name, icon, color, user.familyId);
          }
          setShowCreateCategoryModal(false);
        }}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      ...cardShadow,
    },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveButton: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
    },
    headerRightGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xxl,
    },
    // Shared "floating card" look used by every section on this screen
    card: {
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      ...cardShadow,
    },
    label: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: spacing.sm,
    },
    iconBadge: {
      width: 28,
      height: 28,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.sm,
    },
    // Shared selector button (category / recurrence) styling
    selectorButton: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
    },
    selectorText: {
      flex: 1,
      fontSize: fontSize.base,
      fontWeight: fontWeight.medium,
    },
    // Shared settings-style row (toggles with icon + title + description)
    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: borderRadius.lg,
      padding: spacing.md,
    },
    settingsRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: spacing.sm,
    },
    settingsRowLabel: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
    },
    endDateContainer: {
      marginTop: spacing.md,
    },
    endDateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginTop: spacing.sm,
    },
    endDateText: {
      fontSize: fontSize.base,
    },
  });
