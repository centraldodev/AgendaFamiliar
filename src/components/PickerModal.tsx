import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@hooks/useThemeColors';
import { borderRadius, fontSize, fontWeight, spacing } from '@styles/spacing';
import React, { useMemo } from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface PickerOption {
  label: string;
  value: string;
  color?: string;
  icon?: string;
}

interface PickerModalProps {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  onCreate?: () => void;
}

export default function PickerModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  onCreate,
}: PickerModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.modal}>
          <View style={styles.dragHandle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="Fechar"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = item.value === selectedValue;
              return (
                <TouchableOpacity
                  style={[
                    styles.option,
                    { backgroundColor: isSelected ? colors.primary + '14' : colors.backgroundSecondary },
                  ]}
                  onPress={() => {
                    onSelect(item.value);
                    onClose();
                  }}
                >
                  {item.icon && (
                    <View style={[styles.optionIcon, { backgroundColor: item.color || colors.primary }]}>
                      <Ionicons name={item.icon as any} size={16} color="#FFF" />
                    </View>
                  )}
                  <Text
                    style={[
                      styles.optionText,
                      { color: isSelected ? colors.primary : colors.text },
                      isSelected && styles.optionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={
              onCreate ? (
                <TouchableOpacity
                  style={[styles.option, styles.createOption, { borderColor: colors.border }]}
                  onPress={() => {
                    onClose();
                    onCreate();
                  }}
                >
                  <View style={[styles.optionIcon, { backgroundColor: colors.primary }]}>
                    <Ionicons name="add" size={16} color="#FFF" />
                  </View>
                  <Text style={styles.createOptionText}>Criar nova...</Text>
                </TouchableOpacity>
              ) : null
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    maxHeight: '75%',
  },
  dragHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  optionIcon: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  optionText: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  optionTextSelected: {
    fontWeight: fontWeight.semibold,
  },
  createOption: {
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: spacing.xs,
  },
  createOptionText: {
    fontSize: fontSize.base,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
});

