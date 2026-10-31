import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef } from "react";
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
import { appStyles as s } from "../styles/appStyles";
export function AppLayout({
  controller,
  children,
}: {
  controller: AgendaController;
  children: React.ReactNode;
}) {
  const { actions, session, taskForm, showFab } = controller;
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    if (taskForm.form) scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [taskForm.form]);
  const error = actions.error || session.error;
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[s.container, showFab && s.agendaContainer]}
        >
          <AppHeader
            signedIn={!!session.user}
            onLogout={() => void actions.run(logout)}
          />
          {!!error && (
            <View accessibilityRole="alert" style={s.error}>
              <Text style={{ color: "#9b3434" }}>{error}</Text>
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
