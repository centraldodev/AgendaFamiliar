import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "../../styles/theme";
import { message } from "../../utils/message";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { Field } from "./Field";
import type { IconName } from "./Icon";
import { OptionRow } from "./OptionRow";
import { SelectField } from "./SelectField";
// Lista de escolha única num painel próprio; só aplica ao confirmar.
export function OptionPicker({
  label,
  options,
  value,
  onChange,
  placeholder = "Escolher",
  onCreate,
  createLabel = "Nova opção",
  iconOf,
}: {
  label: string;
  options: [key: string, label: string][];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Cria uma opção nova e devolve sua chave, que fica selecionada. */
  onCreate?: (label: string) => Promise<string>;
  createLabel?: string;
  /** Ícone de cada opção (ex.: categorias). */
  iconOf?: (key: string) => IconName;
}) {
  const { s } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const create = async () => {
    if (!onCreate || !newLabel.trim() || creating) return;
    setCreating(true);
    setError("");
    try {
      setDraft(await onCreate(newLabel));
      setNewLabel("");
    } catch (failure) {
      setError(message(failure));
    } finally {
      setCreating(false);
    }
  };
  const current = options.find(([key]) => key === value)?.[1] ?? "";
  return (
    <>
      <SelectField
        label={label}
        value={current}
        placeholder={placeholder}
        icon={iconOf?.(value)}
        onPress={() => {
          setDraft(value);
          setNewLabel("");
          setError("");
          setOpen(true);
        }}
      />
      <BottomSheet
        visible={open}
        title={label}
        onClose={() => setOpen(false)}
        footer={
          <Button
            title="Confirmar"
            onPress={() => {
              onChange(draft);
              setOpen(false);
            }}
          />
        }
      >
        {options.map(([key, text]) => (
          <OptionRow
            key={key || "none"}
            label={text}
            selected={draft === key}
            icon={iconOf?.(key)}
            onPress={() => setDraft(key)}
          />
        ))}
        {onCreate && (
          <View style={[s.row, { alignItems: "flex-end" }]}>
            <View style={{ flex: 1 }}>
              <Field
                label={createLabel}
                value={newLabel}
                onChangeText={setNewLabel}
                placeholder="Nome"
                maxLength={40}
                onSubmitEditing={() => void create()}
              />
            </View>
            <Pressable accessibilityRole="button"
              disabled={!newLabel.trim() || creating}
              onPress={() => void create()}
              hitSlop={8}
            >
              <Text style={[s.link, (!newLabel.trim() || creating) && { opacity: 0.4 }]}>
                {creating ? "Criando…" : "Criar"}
              </Text>
            </Pressable>
          </View>
        )}
        {!!error && <Text style={s.errorText}>{error}</Text>}
      </BottomSheet>
    </>
  );
}
