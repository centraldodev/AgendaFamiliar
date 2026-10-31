import { Pressable, Switch, Text, View } from "react-native";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { categories } from "../constants/categories";
import type { AgendaController } from "../controllers/AgendaController";
import { appStyles as s } from "../styles/appStyles";
export function TaskFormView({ controller }: { controller: AgendaController }) {
  const {
    editing,
    title,
    setTitle,
    description,
    setDescription,
    date,
    setDate,
    time,
    setTime,
    category,
    setCategory,
    privateTask,
    setPrivate,
    submit,
    setForm,
  } = controller.taskForm;
  const { busy, run } = controller.actions;
  return (
    <View style={s.card}>
      <Text style={s.heading}>
        {editing ? "Editar tarefa" : "Um novo plano"}
      </Text>
      <Field
        label="Título"
        value={title}
        onChangeText={setTitle}
        maxLength={160}
      />
      <Field
        label="Descrição (opcional)"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={4000}
      />
      <Field
        label="Data (AAAA-MM-DD)"
        value={date}
        onChangeText={setDate}
        placeholder="2026-10-31"
        maxLength={10}
      />
      <Field
        label="Horário (HH:MM, opcional)"
        value={time}
        onChangeText={setTime}
        placeholder="14:30"
        maxLength={5}
      />
      <Text style={s.label}>Categoria</Text>
      <View style={s.chips}>
        {Object.entries({
          ...categories,
          ...(!categories[category] ? { [category]: category } : {}),
        }).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setCategory(key)}
            style={[s.chip, category === key && s.selectedChip]}
          >
            <Text
              style={{
                color: category === key ? "#fff" : "#31574c",
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Tarefa privada</Text>
          <Text style={s.muted}>Só você poderá visualizar.</Text>
        </View>
        <Switch
          accessibilityLabel="Tarefa privada"
          value={privateTask}
          onValueChange={setPrivate}
          trackColor={{ true: "#315f50" }}
        />
      </View>
      {editing && editing.recurrence !== "none" && (
        <Text style={s.muted}>
          Esta tarefa tem recorrência no app original. Os dados de recorrência
          serão preservados.
        </Text>
      )}
      <Button
        title={busy ? "Salvando…" : "Salvar tarefa"}
        disabled={busy}
        onPress={() => void run(submit)}
      />
      <Button
        title="Cancelar"
        secondary
        disabled={busy}
        onPress={() => setForm(false)}
      />
    </View>
  );
}
