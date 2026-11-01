import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { RecurrencePicker } from "../components/tasks/RecurrencePicker";
import { SubtaskEditor } from "../components/tasks/SubtaskEditor";
import { BottomSheet } from "../components/ui/BottomSheet";
import { Button } from "../components/ui/Button";
import { DateTimeField } from "../components/ui/DateTimeField";
import { Field } from "../components/ui/Field";
import { OptionPicker } from "../components/ui/OptionPicker";
import { categoryIcon, categoryOptions } from "../constants/categories";
import type { AgendaController } from "../controllers/AgendaController";
import { canCreatePrivateTask } from "../middlewares/canCreatePrivateTask";
import { useTheme } from "../styles/theme";
// Criar e editar em um painel que sobe de baixo; listas longas abrem em outro painel.
export function TaskFormView({ controller }: { controller: AgendaController }) {
  const { s, colors } = useTheme();
  const {
    form,
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
    assignedTo,
    setAssignedTo,
    subtasks,
    addSubtask,
    updateSubtask,
    removeSubtask,
    recurrenceRule,
    setRecurrenceRule,
    submit,
    setForm,
  } = controller.taskForm;
  const { busy, run, error } = controller.actions;
  const { profile } = controller.session;
  const [newSubtask, setNewSubtask] = useState("");
  const members = controller.familyManagement.overview?.members ?? [];
  // Só administradores usam tarefas privadas, e apenas nas suas próprias.
  const canChoosePrivacy =
    canCreatePrivateTask(profile) &&
    (!editing || editing.createdBy === profile?.uid);
  const add = () => {
    if (!newSubtask.trim()) return;
    addSubtask(newSubtask.trim());
    setNewSubtask("");
  };
  return (
    <BottomSheet
      visible={form}
      title={editing ? "Editar tarefa" : "Nova tarefa"}
      onClose={() => !busy && setForm(false)}
      footer={
        <Button
          title={busy ? "Salvando…" : "Salvar tarefa"}
          variant="accent"
          disabled={busy}
          onPress={() => void run(submit)}
        />
      }
    >
      {/* O erro também aparece aqui, pois o painel cobre o aviso da tela. */}
      {!!error && <Text style={s.errorText}>{error}</Text>}
      <Field label="Título" value={title} onChangeText={setTitle} maxLength={160} />
      <Field
        label="Descrição (opcional)"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={4000}
      />
      <View style={[s.row, { alignItems: "flex-start" }]}>
        <View style={{ flex: 1 }}>
          <DateTimeField
            label="Data"
            mode="date"
            value={date}
            onChange={setDate}
            placeholder="2026-10-31"
          />
        </View>
        <View style={{ flex: 1 }}>
          <DateTimeField
            label="Horário"
            mode="time"
            value={time}
            onChange={setTime}
            placeholder="Opcional"
            onClear={() => setTime("")}
          />
        </View>
      </View>
      <OptionPicker
        label="Categoria"
        options={categoryOptions(category)}
        value={category}
        onChange={setCategory}
        onCreate={controller.categories.create}
        createLabel="Nova categoria"
        iconOf={categoryIcon}
      />
      {!privateTask && (
        <OptionPicker
          label="Responsável"
          options={[
            ["", "Ninguém em especial"],
            ...members.map((m): [string, string] => [
              m.uid,
              m.uid === profile?.uid ? `${m.displayName || m.email} (você)` : m.displayName || m.email || "Membro",
            ]),
          ]}
          value={assignedTo ?? ""}
          onChange={(value) => setAssignedTo(value || null)}
          iconOf={(key) => (key ? "person-outline" : "people-outline")}
        />
      )}
      <RecurrencePicker value={recurrenceRule} onChange={setRecurrenceRule} />
      {canChoosePrivacy && (
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Tarefa privada</Text>
            <Text style={s.muted}>Só você poderá visualizar.</Text>
          </View>
          <Switch
            accessibilityLabel="Tarefa privada"
            value={privateTask}
            onValueChange={setPrivate}
            trackColor={{ true: colors.primary }}
          />
        </View>
      )}
      <Text style={s.label}>Subtarefas</Text>
      {subtasks.map((item) => (
        <SubtaskEditor
          key={item.id}
          item={item}
          onChange={(patch) => updateSubtask(item.id, patch)}
          onRemove={() => removeSubtask(item.id)}
          onCreateCategory={controller.categories.create}
        />
      ))}
      {subtasks.length < 30 && (
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Field
              label="Nova subtarefa"
              value={newSubtask}
              onChangeText={setNewSubtask}
              placeholder="Ex.: comprar pão"
              maxLength={160}
              onSubmitEditing={add}
            />
          </View>
          <Pressable accessibilityRole="button" disabled={!newSubtask.trim()} onPress={add} hitSlop={8}>
            <Text style={s.link}>Adicionar</Text>
          </Pressable>
        </View>
      )}
    </BottomSheet>
  );
}
