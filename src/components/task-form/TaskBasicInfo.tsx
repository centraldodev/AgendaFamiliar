import { useThemeColors } from '@hooks/useThemeColors';
import { borderRadius, cardShadow, fontSize, fontWeight, spacing } from '@styles/spacing';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TextInput, View } from 'react-native';

interface TaskBasicInfoProps {
  title: string;
  description: string;
  onTitleChange: (text: string) => void;
  onDescriptionChange: (text: string) => void;
}

/**
 * Component for basic task information (title and description)
 * Follows Single Responsibility Principle
 */
export const TaskBasicInfo: React.FC<TaskBasicInfoProps> = ({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
}) => {
  const colors = useThemeColors();
  const { t } = useTranslation();

  return (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {t('tasks.task_title')}
        <Text style={{ color: colors.danger }}> *</Text>
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.backgroundSecondary,
            color: colors.text,
            borderColor: colors.border,
          },
        ]}
        value={title}
        onChangeText={onTitleChange}
        placeholder={t('tasks.title_placeholder')}
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={[styles.label, styles.secondLabel, { color: colors.textSecondary }]}>
        {t('tasks.task_description')}
      </Text>
      <TextInput
        style={[
          styles.input,
          styles.textArea,
          {
            backgroundColor: colors.backgroundSecondary,
            color: colors.text,
            borderColor: colors.border,
          },
        ]}
        value={description}
        onChangeText={onDescriptionChange}
        placeholder={t('tasks.description_placeholder')}
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={4}
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
  secondLabel: {
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: fontSize.base,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
