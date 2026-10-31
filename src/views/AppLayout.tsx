import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "../components/layout/AppHeader";
import { NewTaskFab } from "../components/tasks/NewTaskFab";
import { Button } from "../components/ui/Button";
import type { AgendaController } from "../controllers/AgendaController";
import { logout } from "../services/auth/logout";
import { useTheme } from "../styles/theme";
export function AppLayout({
  controller,
  children,
}: {
  controller: AgendaController;
  children: React.ReactNode;
}) {
  const { s, name } = useTheme();
  const { actions, session, taskForm, showFab } = controller;
  const error = actions.error || session.error;
  // Nas configurações o cabeçalho some; o botão "Voltar" da tela fecha a área.
  const inSettings =
    controller.tab === "settings" && !!session.profile?.familyId && !!session.family;
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style={name === "dark" ? "light" : "dark"} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[s.container, showFab && s.agendaContainer]}
        >
          {!inSettings && (
            <AppHeader
              signedIn={!!session.user}
              showSettings={!!session.profile?.familyId && !!session.family}
              settingsOpen={controller.tab === "settings"}
              calendarOpen={controller.tab === "calendar"}
              pendingCount={controller.familyManagement.pendingCount}
              onToggleSettings={() => {
                taskForm.setForm(false);
                controller.setTab(controller.tab === "settings" ? "tasks" : "settings");
              }}
              onToggleCalendar={() => {
                taskForm.setForm(false);
                controller.setTab(controller.tab === "calendar" ? "tasks" : "calendar");
              }}
              onLogout={() => void actions.run(logout)}
            />
          )}
          {!!error && (
            <View accessibilityRole="alert" style={s.error}>
              <Text style={s.errorText}>{error}</Text>
              {session.user && !session.profile && !session.loading && (
                <Button
                  title="Tentar carregar novamente"
                  disabled={actions.busy}
                  onPress={() => void actions.run(session.retry)}
                />
              )}
            </View>
          )}
          {!!actions.notice && <Text style={s.notice}>{actions.notice}</Text>}
          {children}
        </ScrollView>
        {showFab && (
          <NewTaskFab
            disabled={actions.busy}
            onPress={() => taskForm.openForm()}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
