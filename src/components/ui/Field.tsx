import React from "react";
import { Text, TextInput, View } from "react-native";
import { useTheme } from "../../styles/theme";
export function Field({
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { s, colors, name } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={name}
        style={[
          s.input,
          props.multiline && { minHeight: 90, textAlignVertical: "top" },
        ]}
        {...props}
      />
    </View>
  );
}
