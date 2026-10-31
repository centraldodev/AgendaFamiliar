import { useAgendaController } from "../controllers/useAgendaController";
import { AppLayout } from "../views/AppLayout";
import { ScreenRouter } from "./ScreenRouter";
export function AppRouter() {
  const controller = useAgendaController();
  return (
    <AppLayout controller={controller}>
      <ScreenRouter controller={controller} />
    </AppLayout>
  );
}
