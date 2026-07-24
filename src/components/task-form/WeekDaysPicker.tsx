import { WEEK_DAYS } from '@constants/task';
import { useThemeColors } from '@hooks/useThemeColors';
import { borderRadius, fontSize, fontWeight, spacing } from '@styles/spacing';
import type { WeekDay } from '@types';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface WeekDaysPickerProps {
    selectedDays: WeekDay[];
    onDaysChange: (days: WeekDay[]) => void;
}

export function WeekDaysPicker({ selectedDays, onDaysChange }: WeekDaysPickerProps) {
    const colors = useThemeColors();

    const toggleDay = (day: WeekDay) => {
        if (selectedDays.includes(day)) {
            // Remove day if already selected (but keep at least one)
            if (selectedDays.length > 1) {
                onDaysChange(selectedDays.filter(d => d !== day));
            }
        } else {
            // Add day
            onDaysChange([...selectedDays, day].sort((a, b) => a - b));
        }
    };

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Repetir nos dias:</Text>
            <View style={styles.daysRow}>
                {WEEK_DAYS.map(({ day, label, fullLabel }) => {
                    const isSelected = selectedDays.includes(day);
                    return (
                        <TouchableOpacity
                            key={day}
                            style={[
                                styles.dayButton,
                                {
                                    backgroundColor: isSelected ? colors.primary : colors.surface,
                                    borderColor: isSelected ? colors.primary : colors.border,
                                },
                            ]}
                            onPress={() => toggleDay(day)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.dayText,
                                    { color: isSelected ? '#FFF' : colors.text },
                                ]}
                            >
                                {label}
                            </Text>
                            <Text
                                style={[
                                    styles.dayFullText,
                                    { color: isSelected ? 'rgba(255,255,255,0.8)' : colors.textSecondary },
                                ]}
                            >
                                {fullLabel}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: spacing.md,
    },
    label: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginBottom: spacing.sm,
    },
    daysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.xs,
    },
    dayButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm + 2,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
    },
    dayText: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
    },
    dayFullText: {
        fontSize: fontSize.xs,
        marginTop: 2,
    },
});

export default WeekDaysPicker;
