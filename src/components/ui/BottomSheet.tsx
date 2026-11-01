import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../styles/theme";
// Painel que sobe de baixo para cima. Tocar fora ou no "voltar" do Android fecha.
export function BottomSheet({
  visible,
  title,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { s } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={s.sheetBackdrop}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable accessibilityRole="button"
          style={{ flex: 1 }}
          accessibilityLabel="Fechar"
          onPress={onClose}
        />
        <View style={[s.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <View style={s.sheetHandle} />
          <View style={s.row}>
            <Text style={s.heading}>{title}</Text>
            <Pressable accessibilityRole="button" onPress={onClose} hitSlop={10} accessibilityLabel="Fechar">
              <Text style={s.accentLink}>Fechar</Text>
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 14, paddingBottom: 8 }}
          >
            {children}
          </ScrollView>
          {footer}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
