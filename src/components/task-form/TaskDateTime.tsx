import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@hooks/useThemeColors';
import { borderRadius, cardShadow, fontSize, fontWeight, spacing } from '@styles/spacing';
import { formatDate } from '@utils/dateUtils';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Only import DateTimePicker for native platforms
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

interface TaskDateTimeProps {
  dueDate: Date;
  dueTime: Date | null;
  onDateChange: (date: Date) => void;
  onTimeChange: (time: Date | null) => void;
}

/**
 * Component for date and time selection
 * Handles platform-specific date/time pickers
 * Uses native inputs on web, DateTimePicker on mobile
 */
export const TaskDateTime: React.FC<TaskDateTimeProps> = ({
  dueDate,
  dueTime,
  onDateChange,
  onTimeChange,
}) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      onDateChange(selectedDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      onTimeChange(selectedTime);
    }
  };

  const clearTime = () => {
    onTimeChange(null);
  };

  // Format date as YYYY-MM-DD for web input
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format time as HH:MM for web input
  const formatTimeForInput = (time: Date | null) => {
    if (!time) return '';
    const hours = String(time.getHours()).padStart(2, '0');
    const minutes = String(time.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Handle web date input
  const handleWebDateChange = (value: string) => {
    if (value) {
      const [year, month, day] = value.split('-').map(Number);
      const newDate = new Date(year, month - 1, day);
      onDateChange(newDate);
    }
  };

  // Handle web time input
  const handleWebTimeChange = (value: string) => {
    if (value) {
      const [hours, minutes] = value.split(':').map(Number);
      const newTime = new Date();
      newTime.setHours(hours, minutes, 0, 0);
      onTimeChange(newTime);
    } else {
      onTimeChange(null);
    }
  };

  // Web version with native HTML inputs
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {t('tasks.due_date')}
          <Text style={{ color: colors.danger }}> *</Text>
        </Text>
        <View style={[styles.dateButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <input
            type="date"
            value={formatDateForInput(dueDate)}
            onChange={(e) => handleWebDateChange(e.target.value)}
            style={{
              flex: 1,
              marginLeft: 8,
              border: 'none',
              backgroundColor: 'transparent',
              color: colors.text,
              fontSize: 16,
              outline: 'none',
              cursor: 'pointer',
            }}
          />
        </View>

        <Text style={[styles.label, styles.secondLabel, { color: colors.textSecondary }]}>
          {t('tasks.due_time')} ({t('common.optional', 'Opcional')})
        </Text>
        <View style={styles.timeRow}>
          <View style={[styles.dateButton, styles.timeButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
            <Ionicons name="time-outline" size={18} color={colors.primary} />
            <input
              type="time"
              value={formatTimeForInput(dueTime)}
              onChange={(e) => handleWebTimeChange(e.target.value)}
              style={{
                flex: 1,
                marginLeft: 8,
                border: 'none',
                backgroundColor: 'transparent',
                color: colors.text,
                fontSize: 16,
                outline: 'none',
                cursor: 'pointer',
              }}
            />
          </View>

          {dueTime && (
            <TouchableOpacity onPress={clearTime} style={styles.clearButton}>
              <Ionicons name="close-circle" size={22} color={colors.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Native version with DateTimePicker
  return (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {t('tasks.due_date')}
        <Text style={{ color: colors.danger }}> *</Text>
      </Text>
      <TouchableOpacity
        style={[styles.dateButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
        onPress={() => setShowDatePicker(true)}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text style={[styles.dateText, { color: colors.text }]}>
          {formatDate(dueDate)}
        </Text>
      </TouchableOpacity>

      {showDatePicker && DateTimePicker && (
        <DateTimePicker
          value={dueDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      <Text style={[styles.label, styles.secondLabel, { color: colors.textSecondary }]}>
        {t('tasks.due_time')} ({t('common.optional', 'Opcional')})
      </Text>
      <View style={styles.timeRow}>
        <TouchableOpacity
          style={[styles.dateButton, styles.timeButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
          onPress={() => setShowTimePicker(true)}
        >
          <Ionicons name="time-outline" size={18} color={colors.primary} />
          <Text style={[styles.dateText, { color: colors.text }]}>
            {dueTime
              ? `${String(dueTime.getHours()).padStart(2, '0')}:${String(dueTime.getMinutes()).padStart(2, '0')}`
              : t('tasks.no_time', 'Sem horário')}
          </Text>
        </TouchableOpacity>

        {dueTime && (
          <TouchableOpacity onPress={clearTime} style={styles.clearButton}>
            <Ionicons name="close-circle" size={22} color={colors.danger} />
          </TouchableOpacity>
        )}
      </View>

      {showTimePicker && DateTimePicker && (
        <DateTimePicker
          value={dueTime || new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  dateText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginLeft: spacing.sm,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeButton: {
    flex: 1,
  },
  clearButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
});
