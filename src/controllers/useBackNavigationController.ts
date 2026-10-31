import { useEffect, useRef } from "react";
import { BackHandler } from "react-native";
// Botão voltar do celular: fecha a tela aberta e só sai do app na agenda.
export function useBackNavigationController(handleBack: () => boolean) {
  const latest = useRef(handleBack);
  latest.current = handleBack;
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => latest.current(),
    );
    return () => subscription.remove();
  }, []);
}
