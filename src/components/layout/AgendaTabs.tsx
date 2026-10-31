import { Pressable, Text, View } from "react-native";
import type { AgendaTab } from "../../models/Navigation";
import { appStyles as s } from "../../styles/appStyles";
export function AgendaTabs({
  tab,
  onChange,
}: {
  tab: AgendaTab;
  onChange: (tab: AgendaTab) => void;
}) {
  return (
    <View style={s.tabs}>
      {(["tasks", "family"] as const).map((item) => (
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === item }}
          key={item}
          style={[s.tab, tab === item && s.activeTab]}
          onPress={() => onChange(item)}
        >
          <Text
            style={{
              color: tab === item ? "#fff" : "#31574c",
              fontWeight: "600",
            }}
          >
            {item === "tasks" ? "Minha agenda" : "Nossa família"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
