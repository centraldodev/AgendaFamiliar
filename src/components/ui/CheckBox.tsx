import { View } from "react-native";
import { useTheme } from "../../styles/theme";
import { Icon } from "./Icon";
export function CheckBox({
  checked,
  size = 22,
  dimmed = false,
}: {
  checked: boolean;
  size?: number;
  dimmed?: boolean;
}) {
  const { s, colors } = useTheme();
  return (
    <View
      style={[
        s.checkBox,
        { width: size, height: size, borderRadius: size * 0.32 },
        checked && s.checkBoxChecked,
        dimmed && { opacity: 0.35 },
      ]}
    >
      {checked && <Icon name="checkmark" size={size * 0.72} color={colors.onPrimary} />}
    </View>
  );
}
