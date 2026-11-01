import { Pressable, Text, View } from "react-native";
import type { FamilyMember } from "../../models/FamilyMember";
import type { FamilyRole } from "../../models/FamilyRole";
import { useTheme } from "../../styles/theme";
import { roleLabels } from "../../utils/describeHistory";
export function MembersCard({
  members,
  currentUid,
  isAdmin,
  busy,
  onSetRole,
  onRemove,
}: {
  members: FamilyMember[];
  currentUid: string;
  isAdmin: boolean;
  busy: boolean;
  onSetRole: (member: FamilyMember, role: FamilyRole) => void;
  onRemove: (member: FamilyMember) => void;
}) {
  const { s } = useTheme();
  return (
    <View style={s.card}>
      <Text style={s.heading}>Membros</Text>
      {!isAdmin && (
        <Text style={s.muted}>
          Apenas administradores alteram o acesso dos membros.
        </Text>
      )}
      {members.map((member) => {
        const self = member.uid === currentUid;
        const nextRole: FamilyRole = member.role === "admin" ? "user" : "admin";
        return (
          <View key={member.uid} style={s.memberRow}>
            <Text style={s.memberName}>
              {member.displayName || member.email || "Membro"}
              {self ? " (você)" : ""}
            </Text>
            {!!member.email && <Text style={s.muted}>{member.email}</Text>}
            <Text style={[s.rolePill, member.role === "admin" && s.adminPill]}>
              {roleLabels[member.role]}
            </Text>
            {isAdmin && (
              <View style={s.actionsRow}>
                <Pressable accessibilityRole="button"
                  disabled={busy}
                  onPress={() => onSetRole(member, nextRole)}
                >
                  <Text style={s.link}>
                    {nextRole === "admin"
                      ? "Tornar administrador"
                      : "Tornar usuário"}
                  </Text>
                </Pressable>
                {!self && (
                  <Pressable accessibilityRole="button" disabled={busy} onPress={() => onRemove(member)}>
                    <Text style={s.dangerLink}>Remover do grupo</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
