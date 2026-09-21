import { useCallback, useRef } from "react";
import { View } from "react-native";
import { useFocusEffect } from "expo-router";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { BookProgress } from "@/types/domain";
import { PathNode } from "./Path";

/** Only an increase since the last view animates; focus alone never does. */
export function LearningProgressStep({
  progress,
  animate,
  connected,
}: {
  progress?: BookProgress;
  animate: boolean;
  connected: boolean;
}) {
  const percentage = progress?.percentage ?? 0;
  const lastSeen = useRef(percentage);
  const fill = useSharedValue(percentage / 100);
  const scale = useSharedValue(1);
  useFocusEffect(
    useCallback(() => {
      const increased = percentage > lastSeen.current;
      lastSeen.current = percentage;
      const timing = {
        duration: 500,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      };
      if (animate && increased) {
        fill.value = withTiming(percentage / 100, timing);
        scale.value = withSequence(
          withTiming(1.14, { ...timing, duration: 180 }),
          withTiming(1, { ...timing, duration: 300 }),
        );
      } else {
        fill.value = percentage / 100;
        scale.value = 1;
      }
      return () => {
        cancelAnimation(fill);
        cancelAnimation(scale);
        scale.value = 1;
      };
    }, [animate, percentage, fill, scale]),
  );
  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: fill.value }],
  }));
  const nodeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
      <Animated.View style={nodeStyle}>
        <PathNode
          size={20}
          state={
            progress?.status === "COMPLETED"
              ? "done"
              : progress?.status === "READING"
                ? "current"
                : "next"
          }
        />
      </Animated.View>
      {connected && (
        <View style={{ flex: 1, height: 1, backgroundColor: "#C7D4C7" }}>
          <Animated.View
            style={[
              {
                height: 1,
                backgroundColor: "#789782",
                transformOrigin: "left center",
              },
              lineStyle,
            ]}
          />
        </View>
      )}
    </View>
  );
}
