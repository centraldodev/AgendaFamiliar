import PickerModal from '@components/PickerModal';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@hooks/useThemeColors';
import { borderRadius, cardShadow, fontSize, fontWeight, spacing } from '@styles/spacing';
import type { Subtask } from '@types';
import { CATEGORY_OPTIONS, getCategoryColor, getCategoryLabel } from '@utils/taskUtils';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface TaskSubtasksProps {
  subtasks: Subtask[];
  onAdd: (title: string, category: string) => void;
  onRemove: (id: string) => void;
}

/**
 * Component for managing task subtasks
 * Handles adding, removing, and displaying subtasks
 */
export const TaskSubtasks: React.FC<TaskSubtasksProps> = ({
  subtasks,
  onAdd,
  onRemove,
}) => {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskCategory, setNewSubtaskCategory] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const handleAdd = () => {
    if (!newSubtaskTitle.trim()) {
      Alert.alert(t('common.error'), t('tasks.subtask_title_required'));
      return;
    }

    onAdd(newSubtaskTitle, newSubtaskCategory);
    setNewSubtaskTitle('');
    setNewSubtaskCategory('');
  };

  const renderSubtask = ({ item }: { item: Subtask }) => (
    <View style={[styles.subtaskItem, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
      <View style={styles.subtaskInfo}>
        <Text style={[styles.subtaskTitle, { color: colors.text }]}>{item.title}</Text>
        {item.category && (
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: getCategoryColor(item.category) + '20' },
            ]}
          >
            <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]}>
              {getCategoryLabel(item.category)}
            </Text>
          </View>
        )}
      </View>
      <TouchableOpacity onPress={() => onRemove(item.id)} style={styles.removeButton}>
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('tasks.subtasks')}</Text>

      <View style={styles.addSubtaskContainer}>
        <TextInput
          style={[
            styles.input,
            styles.subtaskInput,
            { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border },
          ]}
          value={newSubtaskTitle}
          onChangeText={setNewSubtaskTitle}
          placeholder={t('tasks.new_subtask')}
          placeholderTextColor={colors.textSecondary}
        />

        <TouchableOpacity
          style={[styles.categoryButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
          onPress={() => setShowCategoryPicker(true)}
        >
          <Text style={[styles.categoryButtonText, { color: newSubtaskCategory ? colors.text : colors.textSecondary }]}>
            {newSubtaskCategory ? getCategoryLabel(newSubtaskCategory) : t('tasks.category')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleAdd}
          accessibilityLabel={t('tasks.new_subtask')}
          accessibilityRole="button"
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {subtasks.length > 0 && (
        <FlatList
          data={subtasks}
          renderItem={renderSubtask}
          keyExtractor={(item) => item.id}
          style={styles.subtasksList}
          scrollEnabled={false}
        />
      )}

      <PickerModal
        visible={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        title={t('tasks.select_category')}
        options={CATEGORY_OPTIONS}
        selectedValue={newSubtaskCategory}
        onSelect={(value: string) => {
          setNewSubtaskCategory(value);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
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
  addSubtaskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: fontSize.base,
  },
  subtaskInput: {
    flex: 1,
    marginRight: spacing.sm,
  },
  categoryButton: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginRight: spacing.sm,
  },
  categoryButtonText: {
    fontSize: fontSize.sm,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtasksList: {
    maxHeight: 300,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  subtaskInfo: {
    flex: 1,
  },
  subtaskTitle: {
    fontSize: fontSize.base,
    marginBottom: spacing.xs,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  categoryText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  removeButton: {
    padding: spacing.sm,
  },
});
