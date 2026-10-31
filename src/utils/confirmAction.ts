import { Alert, Platform } from "react-native";
// Confirmação que funciona no celular e na versão web.
export function confirmAction(
  title: string,
  message: string,
  confirmLabel = "Confirmar",
) {
  if (Platform.OS === "web")
    return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
  return new Promise<boolean>((resolve) =>
    Alert.alert(
      title,
      message,
      [
        { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
        { text: confirmLabel, style: "destructive", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}
