import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "./src/firebase";
import {
  familyAction,
  loadFamily,
  loadProfile,
  loadTasks,
  saveTask,
  toggleTask,
} from "./src/api";
import type { Profile, Family, Task } from "./src/types";

const categories: Record<string, string> = {
  home: "Casa",
  work: "Trabalho",
  health: "Saúde",
  education: "Estudos",
  finance: "Finanças",
  leisure: "Lazer",
  other: "Outros",
};
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
function message(error: unknown) {
  const code = (error as { code?: string })?.code;
  const known: Record<string, string> = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/email-already-in-use":
      "Este e-mail já tem uma conta. Entre com sua senha.",
    "auth/weak-password": "Use uma senha com pelo menos 6 caracteres.",
    "auth/invalid-email": "Informe um e-mail válido.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco.",
    "functions/not-found":
      "Família não encontrada ou serviço ainda não publicado.",
    "permission-denied": "Sua conta não tem permissão para esta ação.",
  };
  return (
    known[code ?? ""] ??
    (error instanceof Error
      ? error.message
      : "Não foi possível concluir. Tente novamente.")
  );
}
function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[s.button, secondary && s.secondary, disabled && { opacity: 0.5 }]}
    >
      <Text style={[s.buttonText, secondary && { color: "#31574c" }]}>
        {title}
      </Text>
    </Pressable>
  );
}
function Field({
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
export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}
function Main() {
  const [profile, setProfile] = useState<Profile | null>(null),
    [family, setFamily] = useState<Family | null>(null),
    [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [register, setRegister] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState("");
  const [familyName, setFamilyName] = useState(""),
    [code, setCode] = useState(""),
    [tab, setTab] = useState<"tasks" | "family">("tasks"),
    [filter, setFilter] = useState("pending");
  const [editing, setEditing] = useState<Task | null>(null),
    [form, setForm] = useState(false),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [date, setDate] = useState(today()),
    [time, setTime] = useState(""),
    [category, setCategory] = useState("home"),
    [privateTask, setPrivate] = useState(false);
  const generation = useRef(0);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  const refresh = async () => {
    const token = generation.current;
    const result = await loadTasks();
    if (token === generation.current) setTasks(result);
  };
  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        const token = ++generation.current;
        setLoading(true);
        setProfile(null);
        setFamily(null);
        setTasks([]);
        setError("");
        setForm(false);
        setTab("tasks");
        if (!user) {
          setLoading(false);
          return;
        }
        loadProfile(user)
          .then(async (p) => {
            const f = p.familyId ? await loadFamily(p.familyId) : null;
            if (token === generation.current) {
              setProfile(p);
              setFamily(f);
            }
          })
          .catch((e) => {
            if (token === generation.current) setError(message(e));
          })
          .finally(() => {
            if (token === generation.current) setLoading(false);
          });
      }),
    [],
  );
  useEffect(() => {
    if (!profile?.familyId) return;
    let alive = true,
      running = false;
    const tick = async () => {
      if (running) return;
      running = true;
      try {
        await refresh();
      } catch (e) {
        if (alive) setError(message(e));
      } finally {
        running = false;
      }
    };
    void tick();
    const timer = setInterval(() => void tick(), 20000);
    return () => {
      alive = false;
      clearInterval(timer);
      generation.current++;
    };
  }, [profile?.familyId]);
  const openForm = (task?: Task) => {
    setEditing(task ?? null);
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setDate(task?.dueDate ?? today());
    setTime(task?.dueTime ?? "");
    setCategory(task?.category ?? "home");
    setPrivate(task?.isPrivate ?? false);
    setForm(true);
    setError("");
  };
  const join = async (action: "create" | "join") => {
    await familyAction(action, action === "create" ? familyName : code);
    const p = await loadProfile(auth.currentUser!);
    const f = await loadFamily(p.familyId!);
    setProfile(p);
    setFamily(f);
  };
  const submit = async () => {
    if (!title.trim()) throw new Error("Informe o título da tarefa.");
    const parsed = new Date(`${date}T12:00:00`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      isNaN(parsed.getTime()) ||
      `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}` !==
        date
    )
      throw new Error("Informe uma data válida no formato AAAA-MM-DD.");
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
      throw new Error("Informe o horário no formato HH:MM.");
    await saveTask(
      profile!,
      {
        title,
        description,
        dueDate: date,
        dueTime: time || null,
        category,
        isPrivate: privateTask,
      },
      editing ?? undefined,
    );
    setForm(false);
    await refresh();
  };
  const visible = tasks.filter(
    (t) =>
      filter === "all" ||
      (filter === "private"
        ? t.isPrivate
        : filter === "completed"
          ? t.completed
          : !t.completed),
  );
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.container}
        >
          <View style={s.header}>
            <View>
              <Text style={s.eyebrow}>UM DIA DE CADA VEZ</Text>
              <Text style={s.brand}>Agenda Familiar</Text>
            </View>
            {auth.currentUser && (
              <Pressable
                accessibilityRole="button"
                onPress={() => void run(() => signOut(auth))}
              >
                <Text style={s.link}>Sair</Text>
              </Pressable>
            )}
          </View>
          {!!error && (
            <View accessibilityRole="alert" style={s.error}>
              <Text style={{ color: "#9b3434" }}>{error}</Text>
              {auth.currentUser && !profile && !loading && (
                <Button
                  title="Tentar carregar novamente"
                  onPress={() =>
                    void run(async () => {
                      const p = await loadProfile(auth.currentUser!);
                      setProfile(p);
                      if (p.familyId) setFamily(await loadFamily(p.familyId));
                    })
                  }
                />
              )}
            </View>
          )}
          {!!notice && <Text style={s.notice}>{notice}</Text>}
          {loading ? (
            <ActivityIndicator size="large" color="#315f50" />
          ) : !auth.currentUser ? (
            <View style={s.card}>
              <Text style={s.heading}>
                {register ? "Vamos começar?" : "Bom ter você aqui."}
              </Text>
              <Text style={s.muted}>
                Organize a rotina e divida os planos com quem faz parte da sua
                vida.
              </Text>
              {register && (
                <Field
                  label="Seu nome"
                  value={name}
                  onChangeText={setName}
                  autoComplete="name"
                />
              )}
              <Field
                label="E-mail"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <Field
                label="Senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={register ? "new-password" : "current-password"}
              />
              <Button
                title={
                  busy ? "Aguarde…" : register ? "Criar minha conta" : "Entrar"
                }
                disabled={busy}
                onPress={() =>
                  void run(async () => {
                    if (register) {
                      if (!name.trim()) throw new Error("Informe seu nome.");
                      const result = await createUserWithEmailAndPassword(
                        auth,
                        email.trim(),
                        password,
                      );
                      await updateProfile(result.user, {
                        displayName: name.trim(),
                      });
                      const { setDoc, doc } = await import(
                        "firebase/firestore"
                      );
                      const { db } = await import("./src/firebase");
                      await loadProfile(result.user);
                      await setDoc(
                        doc(db, "users", result.user.uid),
                        { displayName: name.trim() },
                        { merge: true },
                      );
                    } else
                      await signInWithEmailAndPassword(
                        auth,
                        email.trim(),
                        password,
                      );
                  })
                }
              />
              <Button
                title={register ? "Já tenho uma conta" : "Criar uma conta"}
                secondary
                disabled={busy}
                onPress={() => setRegister(!register)}
              />
              {!register && (
                <Pressable
                  onPress={() =>
                    void run(async () => {
                      if (!email.trim())
                        throw new Error("Informe seu e-mail primeiro.");
                      await sendPasswordResetEmail(auth, email.trim());
                      setNotice("Confira seu e-mail para redefinir a senha.");
                    })
                  }
                >
                  <Text style={s.link}>Esqueci minha senha</Text>
                </Pressable>
              )}
            </View>
          ) : profile && !profile.familyId ? (
            <View style={s.card}>
              <Text style={s.heading}>Sua família, no mesmo lugar.</Text>
              <Text style={s.muted}>
                Crie um grupo ou use o código que alguém da família compartilhou
                com você.
              </Text>
              <Field
                label="Nome da família"
                placeholder="Ex.: Família Silva"
                value={familyName}
                onChangeText={setFamilyName}
              />
              <Button
                title="Criar grupo familiar"
                disabled={busy || !familyName.trim()}
                onPress={() => void run(() => join("create"))}
              />
              <View style={s.line} />
              <Field
                label="Código de convite"
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
              />
              <Button
                title="Entrar na família"
                secondary
                disabled={busy || !code.trim()}
                onPress={() => void run(() => join("join"))}
              />
            </View>
          ) : profile && family ? (
            <>
              <View style={s.tabs}>
                {(["tasks", "family"] as const).map((t) => (
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected: tab === t }}
                    key={t}
                    style={[s.tab, tab === t && s.activeTab]}
                    onPress={() => {
                      setTab(t);
                      setForm(false);
                    }}
                  >
                    <Text
                      style={{
                        color: tab === t ? "#fff" : "#31574c",
                        fontWeight: "600",
                      }}
                    >
                      {t === "tasks" ? "Minha agenda" : "Nossa família"}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {tab === "family" ? (
                <View style={s.card}>
                  <Text style={s.heading}>{family.name}</Text>
                  <Text style={s.muted}>
                    Compartilhe este código para sua família entrar no mesmo
                    grupo.
                  </Text>
                  <Text selectable style={s.code}>
                    {family.code}
                  </Text>
                  <Text style={s.muted}>Conta: {profile.email}</Text>
                  <Text style={s.muted}>
                    Tarefas compartilhadas aparecem para todos do grupo. Tarefas
                    privadas ficam visíveis apenas para quem as criou.
                  </Text>
                </View>
              ) : form ? (
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
                      ...(!categories[category]
                        ? { [category]: category }
                        : {}),
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
                      Esta tarefa tem recorrência no app original. Os dados de
                      recorrência serão preservados.
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
              ) : (
                <>
                  <View style={s.hero}>
                    <Text style={s.eyebrow}>{family.name.toUpperCase()}</Text>
                    <Text style={s.heading}>Espaço para o que importa.</Text>
                    <Text style={s.muted}>
                      {tasks.filter((t) => !t.completed).length} tarefas
                      pendentes na sua agenda.
                    </Text>
                    <Button title="+ Nova tarefa" onPress={() => openForm()} />
                  </View>
                  <View style={s.chips}>
                    {[
                      ["pending", "Pendentes"],
                      ["completed", "Concluídas"],
                      ["private", "Privadas"],
                      ["all", "Todas"],
                    ].map(([key, label]) => (
                      <Pressable
                        key={key}
                        style={[s.chip, filter === key && s.selectedChip]}
                        onPress={() => setFilter(key)}
                      >
                        <Text
                          style={{ color: filter === key ? "#fff" : "#31574c" }}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={s.row}>
                    <Text style={s.muted}>
                      Sua agenda · {visible.length} tarefas
                    </Text>
                    <Pressable
                      disabled={busy}
                      onPress={() => void run(refresh)}
                    >
                      <Text style={s.link}>Atualizar</Text>
                    </Pressable>
                  </View>
                  {!visible.length && (
                    <View style={s.card}>
                      <Text style={s.heading}>Tudo tranquilo por aqui.</Text>
                      <Text style={s.muted}>
                        As tarefas deste filtro aparecerão aqui.
                      </Text>
                    </View>
                  )}
                  {visible.map((task) => {
                    const canComplete =
                      task.createdBy === profile.uid ||
                      (!task.isPrivate && profile.role === "admin");
                    return (
                      <View key={task.id} style={s.card}>
                        <View style={s.row}>
                          <Text style={s.tag}>
                            {task.isPrivate ? "🔒 Só você" : "Família"} ·{" "}
                            {categories[task.category] ?? task.category}
                          </Text>
                          <Text style={s.muted}>
                            {task.completed ? "Concluída" : "Pendente"}
                          </Text>
                        </View>
                        <Text
                          style={[
                            s.taskTitle,
                            task.completed && {
                              textDecorationLine: "line-through",
                              color: "#7e8982",
                            },
                          ]}
                        >
                          {task.title}
                        </Text>
                        {!!task.description && (
                          <Text style={s.muted}>{task.description}</Text>
                        )}
                        <Text style={s.label}>
                          {task.dueDate.split("-").reverse().join("/")}{" "}
                          {task.dueTime ? `· ${task.dueTime}` : ""}
                        </Text>
                        <View style={s.row}>
                          {canComplete && (
                            <Button
                              title={task.completed ? "Reabrir" : "Concluir"}
                              secondary
                              disabled={busy}
                              onPress={() =>
                                void run(async () => {
                                  await toggleTask(task);
                                  await refresh();
                                })
                              }
                            />
                          )}{" "}
                          {task.createdBy === profile.uid && (
                            <Pressable
                              disabled={busy}
                              onPress={() => openForm(task)}
                            >
                              <Text style={s.link}>Editar</Text>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    );
                  })}
                  <Text style={s.footer}>
                    A agenda atualiza automaticamente a cada 20 segundos.
                  </Text>
                </>
              )}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f6f7f2" },
  container: {
    padding: 24,
    gap: 20,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingBottom: 50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    color: "#668274",
    fontWeight: "700",
    marginBottom: 7,
  },
  brand: { fontSize: 27, fontWeight: "700", color: "#234a3d" },
  heading: {
    fontSize: 26,
    fontWeight: "600",
    color: "#234a3d",
    lineHeight: 33,
  },
  muted: { color: "#6d7b73", fontSize: 14, lineHeight: 21 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 22,
    gap: 16,
    borderWidth: 1,
    borderColor: "#e5e9df",
  },
  hero: { backgroundColor: "#e8efdf", padding: 24, borderRadius: 22, gap: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#385447" },
  input: {
    borderWidth: 1,
    borderColor: "#dbe2d8",
    backgroundColor: "#fafbf8",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#233e32",
  },
  button: {
    backgroundColor: "#315f50",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  secondary: { backgroundColor: "#edf2e9" },
  buttonText: { fontWeight: "600", color: "#fff", fontSize: 14 },
  link: { color: "#315f50", fontWeight: "600", paddingVertical: 8 },
  error: { padding: 16, backgroundColor: "#fbecea", borderRadius: 12, gap: 12 },
  notice: {
    padding: 16,
    backgroundColor: "#e6efdf",
    color: "#315f50",
    borderRadius: 12,
  },
  line: { height: 1, backgroundColor: "#e5e9df", marginVertical: 8 },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#e9eee4",
    padding: 5,
    borderRadius: 14,
    gap: 6,
  },
  tab: { flex: 1, padding: 12, alignItems: "center", borderRadius: 10 },
  activeTab: { backgroundColor: "#315f50" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: "#eaf0e5",
  },
  selectedChip: { backgroundColor: "#315f50" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  taskTitle: { fontSize: 20, fontWeight: "600", color: "#284a3a" },
  tag: { fontSize: 12, color: "#54705e", flexShrink: 1 },
  code: {
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: 3,
    color: "#315f50",
    paddingVertical: 12,
  },
  footer: { fontSize: 12, color: "#7d8a81", textAlign: "center" },
});
