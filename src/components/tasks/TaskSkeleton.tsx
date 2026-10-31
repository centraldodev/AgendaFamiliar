import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, StyleSheet, View } from "react-native";

export function TaskSkeleton({
  showNavigation = true,
}: {
  showNavigation?: boolean;
}) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let mounted = true;
    let animation: Animated.CompositeAnimation | undefined;
    const updateMotion = (reduceMotion: boolean) => {
      if (!mounted) return;
      animation?.stop();
      opacity.setValue(1);
      if (!reduceMotion) {
        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.45,
              duration: 850,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 850,
              useNativeDriver: true,
            }),
          ]),
        );
        animation.start();
      }
    };
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(updateMotion)
      .catch(() => updateMotion(false));
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      updateMotion,
    );
    return () => {
      mounted = false;
      subscription.remove();
      animation?.stop();
    };
  }, [opacity]);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando tarefas"
      accessibilityState={{ busy: true }}
    >
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.content, { opacity }]}
      >
        {showNavigation && <View style={styles.navigation} />}
        <View style={styles.row}>
          {[92, 100, 78].map((width) => (
            <View key={width} style={[styles.chip, { width }]} />
          ))}
        </View>
        <View style={[styles.line, { width: "42%" }]} />
        {[0, 1, 2].map((index) => (
          <View key={index} style={styles.card}>
            <View style={styles.spaceBetween}>
              <View style={[styles.line, { width: "30%", height: 12 }]} />
              <View style={[styles.line, { width: "18%", height: 12 }]} />
            </View>
            <View
              style={[
                styles.line,
                { width: index === 1 ? "58%" : "76%", height: 23 },
              ]}
            />
            <View style={[styles.line, { width: "88%" }]} />
            <View style={[styles.line, { width: "36%", height: 13 }]} />
            <View
              style={[
                styles.line,
                { width: 112, height: 40, borderRadius: 12 },
              ]}
            />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20 },
  navigation: { height: 52, borderRadius: 14, backgroundColor: "#e4eade" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  spaceBetween: { flexDirection: "row", justifyContent: "space-between" },
  chip: { height: 36, borderRadius: 20, backgroundColor: "#e4eade" },
  line: { height: 16, borderRadius: 8, backgroundColor: "#e4eade" },
  card: {
    padding: 22,
    gap: 17,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e9ede4",
  },
});
