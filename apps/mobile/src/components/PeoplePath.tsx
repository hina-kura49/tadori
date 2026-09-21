import { View } from "react-native";
import { Circle, Database } from "@/types/domain";
import { Avatar, Row, Txt } from "./ui";
import { PathNode } from "./Path";
import { circlePositions } from "@/lib/circleProgress";
import { colors as c } from "@/lib/theme";
export function PeoplePath({
  circle,
  data,
}: {
  circle: Circle;
  data: Database;
}) {
  const positions = circlePositions(circle, data);
  const roadmap = data.roadmaps.find((r) => r.id === circle.targetId);
  const count =
    circle.targetType === "Roadmap" ? (roadmap?.steps.length ?? 1) : 3;
  const bucket = (p: { step: number; percentage: number }) =>
    circle.targetType === "Roadmap"
      ? Math.min(count - 1, p.step)
      : p.percentage >= 100
        ? 2
        : p.percentage > 0
          ? 1
          : 0;
  const here = positions.filter(
    (p) =>
      p.position &&
      (circle.targetType === "Book"
        ? p.position.percentage > 0 && p.position.percentage < 100
        : p.position.step === circle.currentStep),
  );
  return (
    <View style={{ gap: 14 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Txt style={{ fontSize: 12, fontWeight: "500" }}>みんなの現在地</Txt>
        <Txt muted style={{ fontSize: 10 }}>
          {circle.targetType === "Roadmap" ? "Book steps" : "Reading progress"}
        </Txt>
      </Row>
      <Row style={{ alignItems: "flex-start", gap: 0 }}>
        {Array.from({ length: count }, (_, i) => {
          const people = positions.filter(
            (p) => p.position && bucket(p.position) === i,
          );
          return (
            <View key={i} style={{ flex: 1, alignItems: "center", gap: 8 }}>
              <Row style={{ gap: 0, width: "100%" }}>
                <View
                  style={{
                    flex: 1,
                    height: 1,
                    backgroundColor: i ? "#C6D4C9" : "transparent",
                  }}
                />
                <PathNode
                  state={people.length ? "current" : "next"}
                  label={String(i + 1)}
                  size={23}
                />
                <View
                  style={{
                    flex: 1,
                    height: 1,
                    backgroundColor: i < count - 1 ? "#C6D4C9" : "transparent",
                  }}
                />
              </Row>
              <Txt muted style={{ fontSize: 10, lineHeight: 14 }}>
                {circle.targetType === "Roadmap"
                  ? `Book ${i + 1}`
                  : ["Start", "Reading", "Done"][i]}
              </Txt>
              <Row style={{ gap: 0, minHeight: 28 }}>
                {people.slice(0, 3).map((person, j) => (
                  <View key={person.name} style={{ marginLeft: j ? -8 : 0 }}>
                    <Avatar name={person.name} size={28} />
                  </View>
                ))}
                {people.length > 3 && (
                  <Txt muted style={{ fontSize: 10 }}>
                    +{people.length - 3}
                  </Txt>
                )}
              </Row>
            </View>
          );
        })}
      </Row>
      <Txt style={{ fontSize: 12, color: c.accent }}>
        {here.length
          ? `${here.length}人が${circle.targetType === "Roadmap" ? `Book ${circle.currentStep + 1}を` : "この本を"}進めています`
          : "それぞれのペースで、一歩ずつ。"}
      </Txt>
      {positions.some((p) => !p.position) && (
        <Txt muted style={{ fontSize: 10 }}>
          現在地の共有待ち ·{" "}
          {positions
            .filter((p) => !p.position)
            .map((p) => p.name)
            .join("、")}
        </Txt>
      )}
    </View>
  );
}
