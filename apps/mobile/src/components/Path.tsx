import { View } from "react-native";
import { Check } from "lucide-react-native";
import { colors as c } from "@/lib/theme";
import { Txt } from "./ui";
export function PathNode({
  state = "next",
  label,
  size = 26,
}: {
  state?: "done" | "current" | "next";
  label?: string;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor:
          state === "done" ? c.accent : state === "current" ? c.wash : c.paper,
        borderWidth: state === "current" ? 2 : 1,
        borderColor: state === "next" ? "#CBD5CD" : c.accent,
      }}
    >
      {state === "done" ? (
        <Check size={size * 0.5} color="white" />
      ) : label ? (
        <Txt
          style={{
            fontSize: 10,
            lineHeight: 14,
            color: state === "next" ? c.muted : c.accent,
            fontWeight: "500",
          }}
        >
          {label}
        </Txt>
      ) : state === "current" ? (
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: c.accent,
          }}
        />
      ) : null}
    </View>
  );
}
export function PathRail({
  count,
  current = -1,
  completed = [],
}: {
  count: number;
  current?: number;
  completed?: number[];
}) {
  return (
    <View
      accessibilityLabel={`${count}ステップ${current >= 0 ? `、現在地は${current + 1}` : ""}`}
      style={{ flexDirection: "row", alignItems: "center" }}
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
        >
          <View
            style={{
              flex: 1,
              height: 1,
              backgroundColor: i === 0 ? "transparent" : "#CCD7CE",
            }}
          />
          <PathNode
            state={
              completed.includes(i)
                ? "done"
                : current === i
                  ? "current"
                  : "next"
            }
            label={String(i + 1)}
            size={24}
          />
          <View
            style={{
              flex: 1,
              height: 1,
              backgroundColor: i === count - 1 ? "transparent" : "#CCD7CE",
            }}
          />
        </View>
      ))}
    </View>
  );
}
