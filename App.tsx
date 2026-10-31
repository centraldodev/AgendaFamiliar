import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppRouter } from "./src/routes/AppRouter";
export default function App() {
  return (
    <SafeAreaProvider>
      <AppRouter />
    </SafeAreaProvider>
  );
}
