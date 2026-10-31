import AsyncStorage from "@react-native-async-storage/async-storage";
export type ThemePreference = "system" | "light" | "dark";
const key = "agenda:themePreference";
// Preferência do aparelho (não vai para a conta): cada celular escolhe a sua.
export async function loadThemePreference(): Promise<ThemePreference> {
  const value = await AsyncStorage.getItem(key).catch(() => null);
  return value === "light" || value === "dark" ? value : "system";
}
export async function saveThemePreference(value: ThemePreference) {
  await AsyncStorage.setItem(key, value).catch(() => {});
}
