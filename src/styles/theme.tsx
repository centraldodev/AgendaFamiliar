import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import {
  loadThemePreference,
  saveThemePreference,
  type ThemePreference,
} from "../services/settings/themePreference";
import { createAppStyles, type AppStyles } from "./appStyles";
import { darkColors, lightColors, type ColorTokens } from "./tokens";
export type ThemeName = "light" | "dark";
export interface Theme {
  name: ThemeName;
  colors: ColorTokens;
  s: AppStyles;
  /** Escolha do usuário: "system" segue o aparelho. */
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
}
const palettes: Record<ThemeName, ColorTokens> = { light: lightColors, dark: darkColors };
// Os StyleSheets são criados uma vez por paleta.
const styles: Partial<Record<ThemeName, AppStyles>> = {};
const stylesFor = (name: ThemeName) => (styles[name] ??= createAppStyles(palettes[name]));
const ThemeContext = createContext<Theme>({
  name: "light",
  colors: lightColors,
  s: stylesFor("light"),
  preference: "system",
  setPreference: () => {},
});
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  useEffect(() => {
    void loadThemePreference().then(setPreferenceState);
  }, []);
  const name: ThemeName =
    preference === "system" ? (system === "dark" ? "dark" : "light") : preference;
  const theme = useMemo<Theme>(
    () => ({
      name,
      colors: palettes[name],
      s: stylesFor(name),
      preference,
      setPreference: (value) => {
        setPreferenceState(value);
        void saveThemePreference(value);
      },
    }),
    [name, preference],
  );
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
/** Cores (`colors`), estilos prontos (`s`) e preferência do tema atual. */
export const useTheme = () => useContext(ThemeContext);
