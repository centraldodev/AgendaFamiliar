import { borderRadius, cardShadow, fontSize, fontWeight, spacing } from '@styles/spacing';
import { StyleSheet } from 'react-native';

export const createStyles = (colors: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        scrollContent: {
            padding: spacing.lg,
            paddingBottom: spacing.xxl,
        },
        calendarContainer: {
            backgroundColor: colors.surface,
            borderRadius: borderRadius.xl,
            padding: spacing.sm,
            overflow: 'hidden',
            marginBottom: spacing.lg,
            ...cardShadow,
        },
        tasksSection: {
            backgroundColor: colors.surface,
            borderRadius: borderRadius.xl,
            padding: spacing.lg,
            ...cardShadow,
        },
        tasksHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: spacing.lg,
            gap: spacing.md,
        },
        tasksTitle: {
            fontSize: fontSize.lg,
            fontWeight: fontWeight.bold,
            color: colors.text,
            textTransform: 'capitalize',
            flex: 1,
        },
        addButton: {
            width: 36,
            height: 36,
            borderRadius: borderRadius.lg,
            alignItems: 'center',
            justifyContent: 'center',
        },
        holidayBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            alignSelf: 'flex-start',
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderRadius: borderRadius.xxl,
            marginBottom: spacing.lg,
        },
        holidayText: {
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
        },
        emptyTasks: {
            alignItems: 'center',
            paddingVertical: spacing.xl,
        },
        emptyIconBadge: {
            width: 88,
            height: 88,
            borderRadius: 44,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.md,
        },
        emptyText: {
            fontSize: fontSize.base,
            color: colors.textSecondary,
            textAlign: 'center',
        },
    });
