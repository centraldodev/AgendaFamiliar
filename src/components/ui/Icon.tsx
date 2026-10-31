import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { useTheme } from "../../styles/theme";
export type IconName = ComponentProps<typeof Ionicons>["name"];
// Ícones do app: Ionicons (traço fino, estilo iOS/Material moderno).
// Decorativos por padrão; o rótulo de acessibilidade fica no botão que os contém.
export function Icon({
  name,
  size = 20,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const { colors } = useTheme();
  return (
    <Ionicons
      // Nomes vindos do banco (categorias antigas) podem não existir mais.
      name={name in Ionicons.glyphMap ? name : "grid-outline"}
      size={size}
      color={color ?? colors.icon}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
