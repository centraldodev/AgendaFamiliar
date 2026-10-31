// Tokens do design: toda cor, espaço, raio e fonte do app sai daqui.
// Cores têm nome pelo papel (não pelo tom), para o modo escuro trocar só a paleta.
export const lightColors = {
  // Fundos e superfícies
  background: "#f6f7f2",
  surface: "#ffffff",
  surfaceMuted: "#f3f6f0",
  surfaceSunken: "#e9eee4",
  inputBackground: "#fafbf8",
  skeleton: "#e4eade",
  overlay: "rgba(20, 33, 27, 0.35)",
  shadow: "#18382c",
  // Bordas
  border: "#e5e9df",
  borderStrong: "#dbe2d8",
  divider: "#eef1ea",
  // Marca
  primary: "#315f50",
  primaryPressed: "#234a3d",
  onPrimary: "#ffffff",
  primarySoft: "#eaf0e5",
  onPrimarySoft: "#31574c",
  // Azul do ícone: filtros e seleções secundárias
  accent: "#0a6ee6",
  onAccent: "#ffffff",
  accentSoft: "#e6f0fd",
  onAccentSoft: "#0b57b8",
  // Texto
  textStrong: "#234a3d",
  text: "#233e32",
  textSecondary: "#3d5248",
  textMuted: "#6d7b73",
  textSubtle: "#7d8a81",
  placeholder: "#8a9690",
  overline: "#668274",
  // Ícones e controles
  icon: "#31574c",
  iconMuted: "#7e9a8c",
  // Estados
  danger: "#c0392b",
  onDanger: "#ffffff",
  dangerText: "#9b3434",
  dangerSoft: "#fbecea",
  successSoft: "#e6efdf",
  overdue: "#c2410c",
  overdueText: "#b42318",
  warning: "#d69e2e",
  warningText: "#a16207",
  skippedText: "#8a6d1f",
};
export type ColorTokens = typeof lightColors;
// Escuro: fundos azul-marinho neutros, marca mais clara (contraste AA sobre o fundo) e texto escuro sobre ela.
export const darkColors: ColorTokens = {
  background: "#0f1420",
  surface: "#171d2a",
  surfaceMuted: "#1d2432",
  surfaceSunken: "#232b3a",
  inputBackground: "#131925",
  skeleton: "#252e3d",
  overlay: "rgba(0, 0, 0, 0.6)",
  shadow: "#000000",
  border: "#283143",
  borderStrong: "#353f53",
  divider: "#202838",
  primary: "#6fb39a",
  primaryPressed: "#5a9c84",
  onPrimary: "#0d1f18",
  primarySoft: "#1f3330",
  onPrimarySoft: "#a9d4c3",
  accent: "#4d9bff",
  onAccent: "#08172e",
  accentSoft: "#1b2a44",
  onAccentSoft: "#a9c9ff",
  textStrong: "#e9edf4",
  text: "#dde2ea",
  textSecondary: "#b7bfcc",
  textMuted: "#98a1b0",
  textSubtle: "#848d9c",
  placeholder: "#6c7586",
  overline: "#9aa6ba",
  icon: "#c5cdd9",
  iconMuted: "#76809a",
  danger: "#d9534f",
  onDanger: "#ffffff",
  dangerText: "#f08a84",
  dangerSoft: "#3a1f25",
  successSoft: "#1f3329",
  overdue: "#f0814a",
  overdueText: "#ff8f7a",
  warning: "#e0b046",
  warningText: "#e8c06a",
  skippedText: "#d6b968",
};
export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 999 };
// Escala de texto (fonte do sistema). Use estas variantes em vez de fontSize solto.
export const typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: "700" },
  title: { fontSize: 24, lineHeight: 31, fontWeight: "600" },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: "600" },
  subheading: { fontSize: 16, lineHeight: 22, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 22, fontWeight: "400" },
  bodySmall: { fontSize: 14, lineHeight: 21, fontWeight: "400" },
  label: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
  button: { fontSize: 15, lineHeight: 20, fontWeight: "600" },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "400" },
  overline: { fontSize: 10, lineHeight: 14, fontWeight: "700", letterSpacing: 2 },
} as const;
export const iconSize = { sm: 14, md: 18, lg: 22, xl: 32 };
// Altura mínima de toque (acessibilidade) e largura máxima do conteúdo.
export const layout = { touchTarget: 44, maxWidth: 680 };
