import { borderRadius, cardShadow, fontSize, fontWeight, spacing } from "@styles/spacing";
import { Platform, StyleSheet } from "react-native";

export const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    statsContainer: {
      flexDirection: "row",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: 4,
      gap: spacing.sm,
    },
    filterContainer: {
      marginTop: spacing.lg,
      paddingBottom: spacing.sm,
      paddingHorizontal: spacing.lg,
      ...(Platform.OS === "web"
        ? {
            maxWidth: "100%",
            overflow: "hidden" as const,
          }
        : {}),
    },
    filterContent: {
      gap: spacing.sm,
      flexDirection: "row",
    },
    filterChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.xxl,
      borderWidth: 1,
      marginRight: spacing.sm,
    },
    filterText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
    dateFilterContainer: {
      flexDirection: "row",
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      justifyContent: "space-around",
      borderBottomWidth: 0,
      borderBottomColor: colors.border,
    },
    dateFilterTab: {
      alignItems: "center",
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    dateFilterText: {
      fontSize: fontSize.base,
      fontWeight: "500",
    },
    activeIndicator: {
      height: 3,
      width: "100%",
      marginTop: spacing.xs,
      borderRadius: 2,
    },
    statBox: {
      flex: 1,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      alignItems: "center",
      ...cardShadow,
    },
    statNumber: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      marginBottom: 2,
    },
    statLabel: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
    },
    emptyText: {
      fontSize: fontSize.lg,
      fontWeight: "600",
      marginTop: spacing.md,
    },
    emptySubText: {
      fontSize: fontSize.base,
      marginTop: spacing.sm,
    },
    listContent: {
      paddingVertical: spacing.md,
      paddingBottom: 80,
    },
    fab: {
      position: "absolute",
      bottom: spacing.xl,
      right: spacing.lg,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: "center",
      alignItems: "center",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
        },
        android: {
          elevation: 6,
        },
        web: {
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.2)",
        },
      }),
    },
  });
