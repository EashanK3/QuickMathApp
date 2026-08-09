import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

// Oscillates 0 -> 1 -> 0 in a loop while `active`, and rests at 0 otherwise.
// `duration` is the length of ONE leg (0->1 or 1->0), so the full period is 2x.
export function usePulse(active: boolean, duration = 1200, useNativeDriver = true): Animated.Value {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      value.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver }),
        Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver }),
      ])
    );
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, duration, useNativeDriver]);

  return value;
}
