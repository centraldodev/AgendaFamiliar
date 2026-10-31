import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Recurrence, RecurrenceRule } from "../../models/Recurrence";
import { useTheme } from "../../styles/theme";
import { describeRecurrence, weekDayNames } from "../../utils/describeRecurrence";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { DateTimeField } from "../ui/DateTimeField";
import { Field } from "../ui/Field";
import { OptionRow } from "../ui/OptionRow";
import { SelectField } from "../ui/SelectField";
// Atalhos de 15 e 30 dias gravam "interval"; "Personalizado" deixa escolher o número.
const options: [string, string, Recurrence, number?][] = [
  ["none", "Não repete", "none"],
  ["daily", "Diária", "daily"],
  ["weekly", "Semanal", "weekly"],
  ["15", "A cada 15 dias", "interval", 15],
  ["30", "A cada 30 dias", "interval", 30],
  ["monthly", "Mensal", "monthly"],
  ["yearly", "Anual", "yearly"],
  ["custom_weekly", "Dias da semana", "custom_weekly"],
  ["custom", "Personalizado (a cada N dias)", "interval"],
];
const optionOf = (rule: RecurrenceRule) =>
  rule.recurrence !== "interval"
    ? rule.recurrence
    : rule.recurrenceInterval === 15 || rule.recurrenceInterval === 30
      ? String(rule.recurrenceInterval)
      : "custom";
export function RecurrencePicker({
  value,
  onChange,
}: {
  value: RecurrenceRule;
  onChange: (rule: RecurrenceRule) => void;
}) {
  const { s } = useTheme();
  const [open, setOpen] = useState(false);
  const [option, setOption] = useState(optionOf(value));
  const [days, setDays] = useState("");
  const [weekDays, setWeekDays] = useState<number[]>([]);
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const start = () => {
    setOption(optionOf(value));
    setDays(value.recurrenceInterval ? String(value.recurrenceInterval) : "");
    setWeekDays(value.weekDays ?? []);
    setEndDate(value.recurrenceEndDate ?? "");
    setError("");
    setOpen(true);
  };
  const confirm = () => {
    const [, , recurrence, preset] = options.find(([key]) => key === option)!;
    const interval = preset ?? Number(days);
    if (option === "custom" && (!Number.isInteger(interval) || interval < 1 || interval > 365))
      return setError("Informe um intervalo entre 1 e 365 dias.");
    if (recurrence === "custom_weekly" && !weekDays.length)
      return setError("Escolha pelo menos um dia da semana.");
    onChange({
      recurrence,
      recurrenceInterval: recurrence === "interval" ? interval : null,
      weekDays: recurrence === "custom_weekly" ? weekDays : [],
      recurrenceEndDate: recurrence === "none" ? null : endDate || null,
    });
    setOpen(false);
  };
  return (
    <>
      <SelectField
        label="Repetir"
        value={describeRecurrence(value) || "Não repete"}
        placeholder="Não repete"
        onPress={start}
      />
      <BottomSheet
        visible={open}
        title="Repetir"
        onClose={() => setOpen(false)}
        footer={<Button title="Confirmar" onPress={confirm} />}
      >
        {options.map(([key, label]) => (
          <OptionRow
            key={key}
            label={label}
            selected={option === key}
            onPress={() => {
              setOption(key);
              setError("");
            }}
          />
        ))}
        {option === "custom" && (
          <Field
            label="Repetir a cada quantos dias?"
            value={days}
            onChangeText={(text) => setDays(text.replace(/\D/g, ""))}
            keyboardType="number-pad"
            placeholder="Ex.: 10"
            maxLength={3}
          />
        )}
        {option === "custom_weekly" && (
          <View style={s.chips}>
            {weekDayNames.map((name, day) => {
              const selected = weekDays.includes(day);
              return (
                <Pressable
                  key={name}
                  onPress={() =>
                    setWeekDays((current) =>
                      selected
                        ? current.filter((d) => d !== day)
                        : [...current, day].sort(),
                    )
                  }
                  style={[s.chip, selected && s.selectedChip]}
                >
                  <Text style={[s.chipText, selected && s.selectedChipText]}>{name}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
        {option !== "none" && (
          <DateTimeField
            label="Repetir até (opcional)"
            mode="date"
            value={endDate}
            onChange={setEndDate}
            placeholder="Sem data final"
            onClear={() => setEndDate("")}
          />
        )}
        {!!error && <Text style={s.errorText}>{error}</Text>}
      </BottomSheet>
    </>
  );
}
