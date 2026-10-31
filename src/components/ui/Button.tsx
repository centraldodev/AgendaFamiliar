import { ActivityIndicator, Pressable, Text } from "react-native";
import { Icon, type IconName } from "./Icon";
import { useTheme } from "../../styles/theme";
import { iconSize } from "../../styles/tokens";
export type ButtonVariant = "primary" | "secondary" | "accent" | "accentSoft" | "danger" | "ghost";
export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
}) {
  const { s, colors } = useTheme();
  const fg = {
    primary: colors.onPrimary,
    secondary: colors.onPrimarySoft,
    accent: colors.onAccent,
    accentSoft: colors.onAccentSoft,
    danger: colors.onDanger,
    ghost: colors.primary,
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        size === "sm" && s.buttonSmall,
        s[`button_${variant}`],
        pressed && s[`button_${variant}_pressed`],
        (disabled || loading) && s.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        icon && <Icon name={icon} size={iconSize.md} color={fg} />
      )}
      <Text style={[s.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}
