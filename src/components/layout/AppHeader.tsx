import { Image, Pressable, Text, View } from "react-native";
import { useTheme } from "../../styles/theme";
import { Icon } from "../ui/Icon";
export function AppHeader({
  signedIn,
  showSettings,
  settingsOpen,
  calendarOpen,
  pendingCount,
  onToggleSettings,
  onToggleCalendar,
  onLogout,
}: {
  signedIn: boolean;
  showSettings: boolean;
  settingsOpen: boolean;
  calendarOpen: boolean;
  pendingCount: number;
  onToggleSettings: () => void;
  onToggleCalendar: () => void;
  onLogout: () => void;
}) {
  const { s, colors } = useTheme();
  return (
    <View style={s.header}>
      <View style={s.brandRow}>
        <Image source={require("../../../assets/logo.png")} style={s.logo} accessibilityIgnoresInvertColors />
        <View>
          <Text style={s.eyebrow}>UM DIA DE CADA VEZ</Text>
          <Text style={s.brand}>Agenda Familiar</Text>
        </View>
      </View>
      <View style={s.headerActions}>
        {showSettings && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={calendarOpen ? "Voltar para a agenda" : "Abrir calendário"}
            onPress={onToggleCalendar}
            style={[s.iconButton, calendarOpen && s.iconButtonActive]}
          >
            <Icon
              name={calendarOpen ? "close" : "calendar-outline"}
              size={22}
              color={calendarOpen ? colors.onAccent : colors.icon}
            />
          </Pressable>
        )}
        {showSettings && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              settingsOpen ? "Fechar configurações" : "Abrir configurações"
            }
            onPress={onToggleSettings}
            style={[s.iconButton, settingsOpen && s.iconButtonActive]}
          >
            <Icon
              name={settingsOpen ? "close" : "settings-outline"}
              size={22}
              color={settingsOpen ? colors.onAccent : colors.icon}
            />
            {pendingCount > 0 && !settingsOpen && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{pendingCount}</Text>
              </View>
            )}
          </Pressable>
        )}
        {signedIn && !showSettings && (
          <Pressable accessibilityRole="button" onPress={onLogout} style={s.inlineAction}>
            <Icon name="log-out-outline" size={18} />
            <Text style={s.link}>Sair</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
