import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { useTheme } from "../../styles/theme";
import { Field } from "./Field";
const pad = (n: number) => String(n).padStart(2, "0");
// Seletor nativo de data (AAAA-MM-DD) ou hora (HH:MM). Na web, o seletor nativo
// não existe e o campo vira texto no mesmo formato.
export function DateTimeField({
  label,
  mode,
  value,
  onChange,
  placeholder,
  onClear,
}: {
  label: string;
  mode: "date" | "time";
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onClear?: () => void;
}) {
  const { s, colors, name } = useTheme();
  const [open, setOpen] = useState(false);
  if (Platform.OS === "web")
    return (
      <Field
        label={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        maxLength={mode === "date" ? 10 : 5}
      />
    );
  const current = (() => {
    const now = new Date();
    if (mode === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-").map(Number);
      return new Date(y, m - 1, d, 12);
    }
    if (mode === "time" && /^\d{2}:\d{2}$/.test(value)) {
      const [h, min] = value.split(":").map(Number);
      now.setHours(h, min, 0, 0);
    }
    return now;
  })();
  const shown =
    mode === "date" && value ? value.split("-").reverse().join("/") : value;
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          style={[s.input, { flex: 1, justifyContent: "center" }]}
          onPress={() => setOpen(true)}
        >
          <Text style={{ color: shown ? colors.text : colors.placeholder }}>
            {shown || placeholder}
          </Text>
        </Pressable>
        {!!value && onClear && (
          <Pressable onPress={onClear} hitSlop={8}>
            <Text style={s.dangerLink}>Remover</Text>
          </Pressable>
        )}
      </View>
      {open && (
        <DateTimePicker
          value={current}
          mode={mode}
          is24Hour
          themeVariant={name}
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(event, picked) => {
            if (Platform.OS !== "ios") setOpen(false);
            if (event.type !== "set" || !picked) return;
            onChange(
              mode === "date"
                ? `${picked.getFullYear()}-${pad(picked.getMonth() + 1)}-${pad(picked.getDate())}`
                : `${pad(picked.getHours())}:${pad(picked.getMinutes())}`,
            );
            if (Platform.OS === "ios") setOpen(false);
          }}
        />
      )}
    </View>
  );
}
