import { Text, View } from "react-native";
import type { FamilyRole } from "../../models/FamilyRole";
import type { JoinRequest } from "../../models/JoinRequest";
import { useTheme } from "../../styles/theme";
import { formatDateTime } from "../../utils/formatDateTime";
import { Button } from "../ui/Button";
export function JoinRequestsCard({
  requests,
  busy,
  onApprove,
  onReject,
}: {
  requests: JoinRequest[];
  busy: boolean;
  onApprove: (requestId: string, role: FamilyRole) => void;
  onReject: (requestId: string) => void;
}) {
  const { s } = useTheme();
  return (
    <View style={s.card}>
      <Text style={s.heading}>Solicitações de entrada</Text>
      {!requests.length && (
        <Text style={s.muted}>Nenhuma solicitação pendente.</Text>
      )}
      {requests.map((request) => (
        <View key={request.requestId} style={s.memberRow}>
          <Text style={s.memberName}>{request.displayName}</Text>
          <Text style={s.muted}>
            {request.email} · {formatDateTime(request.createdAt)}
            {request.switching ? " · vindo de outro grupo" : ""}
          </Text>
          <Text style={s.label}>Aceitar como:</Text>
          <View style={s.actionsRow}>
            <Button
              title="Usuário"
              disabled={busy}
              onPress={() => onApprove(request.requestId, "user")}
            />
            <Button
              title="Administrador"
              disabled={busy}
              onPress={() => onApprove(request.requestId, "admin")}
            />
            <Button
              title="Recusar"
              variant="secondary"
              disabled={busy}
              onPress={() => onReject(request.requestId)}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
