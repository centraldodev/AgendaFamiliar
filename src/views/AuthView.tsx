import { Pressable, Text, View } from "react-native";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import type { AgendaController } from "../controllers/AgendaController";
import { loginWithGoogle } from "../services/auth/loginWithGoogle";
import { useTheme } from "../styles/theme";
export function AuthView({ controller }: { controller: AgendaController }) {
  const { s } = useTheme();
  const {
    register,
    setRegister,
    email,
    setEmail,
    password,
    setPassword,
    name,
    setName,
    submit,
    recoverPassword,
  } = controller.authentication;
  const { busy, run } = controller.actions;
  return (
    <View style={s.card}>
      <Text style={s.heading}>
        {register ? "Vamos começar?" : "Bom ter você aqui."}
      </Text>
      <Text style={s.muted}>
        Organize a rotina e divida os planos com quem faz parte da sua vida.
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
        title={busy ? "Aguarde…" : register ? "Criar minha conta" : "Entrar"}
        disabled={busy}
        onPress={() => void run(submit)}
      />
      <Button
        title="Entrar com Google"
        variant="accentSoft"
        icon="logo-google"
        disabled={busy}
        onPress={() => void run(loginWithGoogle)}
      />
      <Button
        title={register ? "Já tenho uma conta" : "Criar uma conta"}
        variant="secondary"
        disabled={busy}
        onPress={() => setRegister(!register)}
      />
      {!register && (
        <Pressable accessibilityRole="button" onPress={() => void run(recoverPassword)}>
          <Text style={s.link}>Esqueci minha senha</Text>
        </Pressable>
      )}
    </View>
  );
}
