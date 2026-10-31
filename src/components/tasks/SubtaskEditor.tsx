import { Pressable, Text, View } from "react-native";
import { categoryIcon, categoryOptions } from "../../constants/categories";
import type { Subtask } from "../../models/Subtask";
import { useTheme } from "../../styles/theme";
import { DateTimeField } from "../ui/DateTimeField";
import { Field } from "../ui/Field";
import { OptionPicker } from "../ui/OptionPicker";
// Uma subtarefa no formulário: título obrigatório; categoria, data e hora opcionais.
export function SubtaskEditor({
  item,
  onChange,
  onRemove,
  onCreateCategory,
}: {
  item: Subtask;
  onChange: (patch: Partial<Subtask>) => void;
  onRemove: () => void;
  onCreateCategory: (label: string) => Promise<string>;
}) {
  const { s } = useTheme();
  return (
    <View style={[s.card, { gap: 10, padding: 14 }]}>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Field
            label={`Subtarefa${item.completed ? " (concluída)" : ""}`}
            value={item.title}
            onChangeText={(title) => onChange({ title })}
            maxLength={160}
          />
        </View>
        <Pressable onPress={onRemove} hitSlop={8}>
          <Text style={s.dangerLink}>Remover</Text>
        </Pressable>
      </View>
      <OptionPicker
        label="Categoria (opcional)"
        placeholder="Sem categoria"
        options={[["", "Sem categoria"], ...categoryOptions(item.category)]}
        onCreate={onCreateCategory}
        createLabel="Nova categoria"
        iconOf={categoryIcon}
        value={item.category ?? ""}
        onChange={(category) => onChange({ category: category || null })}
      />
      <View style={[s.row, { alignItems: "flex-start" }]}>
        <View style={{ flex: 1 }}>
          <DateTimeField
            label="Data (opcional)"
            mode="date"
            value={item.dueDate ?? ""}
            onChange={(dueDate) => onChange({ dueDate })}
            placeholder="Sem data"
            onClear={() => onChange({ dueDate: null })}
          />
        </View>
        <View style={{ flex: 1 }}>
          <DateTimeField
            label="Horário (opcional)"
            mode="time"
            value={item.dueTime ?? ""}
            onChange={(dueTime) => onChange({ dueTime })}
            placeholder="Sem horário"
            onClear={() => onChange({ dueTime: null })}
          />
        </View>
      </View>
    </View>
  );
}
