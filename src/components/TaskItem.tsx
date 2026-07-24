import { RECURRENCE_LABELS, formatWeekDays } from '@constants/task';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@hooks/useThemeColors';
import { useCategoryStore } from '@store/categoryStore';
import { useFamilyMembersStore } from '@store/familyMembersStore';
import { borderRadius, cardShadow, fontSize, fontWeight, spacing } from '@styles/spacing';
import type { Task } from '@types';
import { formatDate, formatDateTime } from '@utils/dateUtils';
import { getCategoryColor, getCategoryIcon, getCategoryLabel } from '@utils/taskUtils';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TaskItemProps {
  task: Task;
  onPress: (task: Task) => void;
  onToggle: (taskId: string) => void;
  onSkip?: (taskId: string) => void;
  onSubtaskToggle?: (taskId: string, subtaskId: string) => void;
  onDelete?: (taskId: string) => void;
  isDeleted?: boolean;
}

export default function TaskItem({ task, onPress, onToggle, onSkip, onSubtaskToggle, onDelete, isDeleted }: TaskItemProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { categories } = useCategoryStore();
  // Subscribe to membersByUid directly (not the getMemberName selector) so
  // this re-renders once family members finish loading asynchronously
  const membersByUid = useFamilyMembersStore((state) => state.membersByUid);
  const getMemberName = (uid?: string): string | null => {
    if (!uid) return null;
    const member = membersByUid[uid];
    return member?.displayName || member?.email || null;
  };
  const [isSubtasksExpanded, setIsSubtasksExpanded] = useState(false);

  // ... (existing helper functions) ...

  const groupSubtasksByCategory = (subtasks: Task['subtasks']) => {
    if (!subtasks || subtasks.length === 0) return {};
    const groups: { [key: string]: Task['subtasks'] } = {};
    subtasks.forEach((subtask) => {
      const cat = subtask.category || t('common.no_category', 'Sem Categoria');
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(subtask);
    });
    return groups;
  };

  const groupedSubtasks = groupSubtasksByCategory(task.subtasks);
  const subtaskCount = task.subtasks?.length || 0;
  const completedSubtaskCount = task.subtasks?.filter((subtask) => subtask.completed).length || 0;
  const hasSubtasks = subtaskCount > 0;
  const allSubtasksCompleted = hasSubtasks && completedSubtaskCount === subtaskCount;
  const categoryColor = getCategoryColor(task.category, categories);
  const categoryIcon = getCategoryIcon(task.category, categories);
  const isRecurring = task.recurrence && task.recurrence !== 'none';
  // Custom weekly recurrence reads better as the actual selected days
  // ("Qui, Sex, Sáb") than the generic "Personalizado" label
  const recurrenceDisplayText =
    task.recurrence === 'custom_weekly' && task.weekDays?.length
      ? formatWeekDays(task.weekDays)
      : t(`recurrence.${task.recurrence}`, { defaultValue: RECURRENCE_LABELS[task.recurrence] });

  const authorName = getMemberName(task.createdBy);
  // Only show "last updated" when something actually happened after creation
  // (otherwise it's just redundant with "created by")
  const hasBeenModifiedSinceCreation =
    !!task.lastModifiedBy && task.updatedAt !== task.createdAt;
  const lastModifiedByName = hasBeenModifiedSinceCreation
    ? getMemberName(task.lastModifiedBy)
    : null;

  return (
    <View style={[
      styles.wrapper,
      { borderLeftColor: categoryColor, borderLeftWidth: 4, backgroundColor: colors.surface },
      isDeleted && { opacity: 0.5, backgroundColor: colors.background }
    ]}>
      <TouchableOpacity
        style={styles.container}
        onPress={() => !isDeleted && onPress(task)}
        disabled={isDeleted}
      >
        {/* ... (existing Main Task Content) ... */}
        <View style={styles.contentContainer}>
          <View style={styles.header}>
            <View style={styles.categoryContainer}>
              <View style={[styles.categoryIconContainer, { backgroundColor: categoryColor }]}>
                <Ionicons name={categoryIcon as any} size={14} color="#fff" />
              </View>
              <Text style={[styles.categoryLabel, { color: categoryColor }]}>
                {getCategoryLabel(task.category, categories)}
              </Text>
            </View>
            <View style={styles.headerActions}>
              {isDeleted && (
                <Text style={[styles.categoryLabel, { color: colors.danger, marginRight: 8 }]}>
                  {t('tasks.deleted', 'EXCLUÍDA')}
                </Text>
              )}
              {hasSubtasks && (
                <View
                  style={[
                    styles.subtaskCountBadge,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: allSubtasksCompleted ? colors.success : colors.danger,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.subtaskCountText,
                      { color: allSubtasksCompleted ? colors.success : colors.danger },
                    ]}
                  >
                    {completedSubtaskCount}/{subtaskCount}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={[
                  styles.expandButton,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                  (!hasSubtasks || isDeleted) && styles.expandButtonDisabled,
                ]}
                onPress={(event) => {
                  event.stopPropagation();
                  if (!hasSubtasks || isDeleted) return;
                  setIsSubtasksExpanded((prev) => !prev);
                }}
                disabled={isDeleted}
                accessibilityLabel={isSubtasksExpanded ? t('tasks.collapse_subtasks', 'Recolher subtarefas') : t('tasks.expand_subtasks', 'Expandir subtarefas')}
                accessibilityRole="button"
              >
                <Ionicons
                  name={isSubtasksExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={hasSubtasks ? colors.textSecondary : colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.mainRow}>
            <TouchableOpacity
              style={[
                styles.checkbox,
                {
                  backgroundColor: task.completed ? colors.success : 'transparent',
                  borderColor: task.completed ? colors.success : colors.border,
                  borderWidth: 2,
                }
              ]}
              onPress={() => !isDeleted && onToggle(task.id)}
              disabled={isDeleted}
              accessibilityLabel={task.completed ? t('tasks.mark_incomplete', 'Marcar como não concluída') : t('tasks.mark_complete', 'Marcar como concluída')}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: task.completed }}
            >
              {task.completed && <Ionicons name="checkmark" size={16} color="#FFF" />}
            </TouchableOpacity>
            <View style={styles.content}>
              <Text style={[
                styles.title,
                { color: colors.text },
                (task.completed || isDeleted) && styles.titleCompleted
              ]} numberOfLines={1}>{task.title}</Text>
              {task.description ? <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={3}>{task.description}</Text> : null}
              <Text style={[styles.date, { color: colors.textSecondary }]}>
                {formatDate(task.dueDate)}
                {task.dueTime ? ` • ${task.dueTime}` : ''}
                {isRecurring && <Text style={[styles.recurrenceText, { color: colors.primary }]}>{' • '}{recurrenceDisplayText}</Text>}
              </Text>
              {authorName && (
                <Text style={[styles.metaText, { color: colors.textTertiary }]} numberOfLines={1}>
                  {t('tasks.created_by', 'Criado por')}: {authorName}
                </Text>
              )}
              {lastModifiedByName && (
                <Text style={[styles.metaText, { color: colors.textTertiary }]} numberOfLines={1}>
                  {t('tasks.updated_by', 'Última alteração')}: {lastModifiedByName} {t('tasks.updated_at', 'em')} {formatDateTime(new Date(task.updatedAt))}
                </Text>
              )}
            </View>
            {isRecurring && onSkip && !task.completed && !isDeleted && (
              <TouchableOpacity
                onPress={() => onSkip(task.id)}
                style={[styles.iconActionButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                accessibilityLabel={t('tasks.skip', 'Pular tarefa')}
                accessibilityRole="button"
              >
                <Ionicons name="play-skip-forward-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            {onDelete && !isDeleted && (
              <TouchableOpacity
                onPress={() => onDelete(task.id)}
                style={[styles.iconActionButton, { marginLeft: 6, backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                accessibilityLabel={t('common.delete', 'Excluir')}
                accessibilityRole="button"
              >
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Subtasks Grouped Display */}
      {hasSubtasks && isSubtasksExpanded && (
        <View style={[styles.subtasksContainer, { borderTopColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
          {Object.entries(groupedSubtasks).map(([category, subtasks]) => (
            <View key={category} style={styles.subtaskGroup}>
              {category !== t('common.no_category', 'Sem Categoria') && category !== '' && (
                <Text style={[styles.subtaskCategoryHeader, { color: colors.primary }]}>{category}</Text>
              )}
              {subtasks.map((subtask) => (
                <View key={subtask.id} style={[styles.subtaskRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <TouchableOpacity
                    style={[
                      styles.subtaskCheckbox,
                      {
                        borderColor: subtask.completed ? colors.success : colors.border,
                        backgroundColor: subtask.completed ? colors.success : 'transparent'
                      }
                    ]}
                    onPress={() => !isDeleted && onSubtaskToggle && onSubtaskToggle(task.id, subtask.id)}
                    disabled={isDeleted}
                    accessibilityLabel={subtask.completed ? t('tasks.mark_incomplete', 'Marcar como não concluída') : t('tasks.mark_complete', 'Marcar como concluída')}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: subtask.completed }}
                  >
                    {subtask.completed && <Ionicons name="checkmark" size={12} color="#FFF" />}
                  </TouchableOpacity>
                  <Text style={[
                    styles.subtaskText,
                    { color: colors.text },
                    (subtask.completed || isDeleted) && styles.titleCompleted
                  ]}>
                    {subtask.title}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    padding: spacing.md,
    overflow: 'hidden',
    ...cardShadow,
  },
  container: {},
  contentContainer: {
    flex: 1,
  },
  header: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
    gap: spacing.xs,
  },
  subtaskCountBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
  subtaskCountText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  expandButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  expandButtonDisabled: {
    opacity: 0.45,
  },
  categoryIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  categoryLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: 2,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  description: {
    fontSize: fontSize.sm,
    marginBottom: 6,
  },
  date: {
    fontSize: fontSize.xs,
    marginBottom: 2,
  },
  metaText: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  recurrenceText: {
    fontWeight: '500',
  },
  iconActionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtasksContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
    borderTopWidth: 1,
    borderRadius: 10,
  },
  subtaskGroup: {
    marginBottom: spacing.sm,
  },
  subtaskCategoryHeader: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    marginBottom: 4,
    marginLeft: 0,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 0,
    marginBottom: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  subtaskCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtaskText: {
    fontSize: fontSize.sm,
    flex: 1,
  },
});
