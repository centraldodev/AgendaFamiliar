import React, { useRef } from "react";
import { Animated, PanResponder, Text, View } from "react-native";
import { useTheme } from "../../styles/theme";
import { Icon } from "./Icon";
const threshold = 96;
// Arrastar para a direita ou esquerda além do limite dispara a ação daquele lado;
// sem ação naquele lado (ou soltando antes), o cartão volta ao lugar.
export function SwipeableRow({
  children,
  disabled,
  right,
  left,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  /** Ação ao arrastar para a direita. */
  right?: { label: string; onSwipe: () => void };
  /** Ação ao arrastar para a esquerda. */
  left?: { label: string; onSwipe: () => void };
}) {
  const { s, colors } = useTheme();
  const x = useRef(new Animated.Value(0)).current;
  const latest = useRef({ disabled, right, left });
  latest.current = { disabled, right, left };
  const reset = () =>
    Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
  const pan = useRef(
    PanResponder.create({
      // Só captura gestos claramente horizontais, deixando a rolagem da lista livre.
      onMoveShouldSetPanResponder: (_, g) =>
        !latest.current.disabled &&
        Math.abs(g.dx) > 12 &&
        Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => {
        const { right, left } = latest.current;
        // Sem ação de um lado, o arraste para aquele lado fica preso.
        x.setValue(g.dx > 0 ? (right ? g.dx : 0) : left ? g.dx : 0);
      },
      onPanResponderRelease: (_, g) => {
        const { right, left } = latest.current;
        const action = g.dx > threshold ? right : g.dx < -threshold ? left : undefined;
        reset();
        action?.onSwipe();
      },
      onPanResponderTerminate: reset,
    }),
  ).current;
  return (
    <View style={s.swipeContainer}>
      <View style={[s.swipeActions]}>
        <View style={s.inlineAction}>
          {right && <Icon name="checkmark-circle-outline" size={22} color={colors.primary} />}
          <Text style={[s.swipeLabel, { color: colors.primary }]}>{right?.label ?? ""}</Text>
        </View>
        <Text style={[s.swipeLabel, { color: colors.dangerText }]}>{left?.label ?? ""}</Text>
      </View>
      <Animated.View style={{ transform: [{ translateX: x }] }} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}
