import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { useTheme } from "../../styles/theme";
import { displayDateTime, maskDateTime, parseDateTime } from "../../utils/maskDateTime";
import { Field } from "./Field";
const pad = (n: number) => String(n).padStart(2, "0");
// Seletor nativo de data (AAAA-MM-DD) ou hora (HH:MM). Na web, o seletor nativo
// não existe: o campo vira texto com máscara (DD/MM/AAAA, HH:MM), só números.
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
    return <MaskedDateTimeField label={label} mode={mode} value={value} onChange={onChange} />;
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
          <Pressable accessibilityRole="button" onPress={onClear} hitSlop={8}>
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

function MaskedDateTimeField({
  label,
  mode,
  value,
  onChange,
}: {
  label: string;
  mode: "date" | "time";
  value: string;
  onChange: (value: string) => void;
}) {
  const { s } = useTheme();
  const [text, setText] = useState(() => displayDateTime(value, mode));
  const [error, setError] = useState("");
  // Valor trocado por fora (ex.: abrir outra tarefa) substitui o que estava digitado.
  useEffect(() => {
    // Incompleto/inválido equivale a "" (o que foi enviado), então não apaga a digitação.
    if ((parseDateTime(text, mode).value ?? "") !== value) setText(displayDateTime(value, mode));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, mode]);
  const change = (raw: string) => {
    const masked = maskDateTime(raw, mode);
    setText(masked);
    const parsed = parseDateTime(masked, mode);
    setError(parsed.error ?? "");
    // Incompleto ou inválido: limpa o valor salvo para o formulário não aceitar.
    onChange(parsed.value ?? "");
  };
  return (
    <View style={{ gap: 6 }}>
      <Field
        label={label}
        value={text}
        onChangeText={change}
        placeholder={mode === "date" ? "DD/MM/AAAA" : "HH:MM"}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={mode === "date" ? 10 : 5}
      />
      {!!error && <Text style={s.errorText}>{error}</Text>}
    </View>
  );
}
