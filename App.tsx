import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppRouter } from "./src/routes/AppRouter";
import { ThemeProvider } from "./src/styles/theme";
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppRouter />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
