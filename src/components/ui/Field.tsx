import React from "react";
import { Text, TextInput, View } from "react-native";
import { appStyles as s } from "../../styles/appStyles";
export function Field({
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#8a9690"
        style={[
          s.input,
          props.multiline && { minHeight: 90, textAlignVertical: "top" },
        ]}
        {...props}
      />
    </View>
  );
}
