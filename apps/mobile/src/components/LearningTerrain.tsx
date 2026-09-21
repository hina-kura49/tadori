import { View } from "react-native";
import { Database } from "@/types/domain";
import { Row, Txt } from "./ui";
import { PathNode } from "./Path";
import { colors as c } from "@/lib/theme";
export function LearningTerrain({
  data,
  maxAreas,
}: {
  data: Database;
  maxAreas?: number;
}) {
  const areas = [
    ...new Set([
      ...data.enrollments.flatMap((e) => {
        const r = data.roadmaps.find((r) => r.id === e.roadmapId);
        return r ? [r.category] : [];
      }),
      ...data.profile.interests,
    ]),
  ];
  return (
    <View style={{ gap: 22 }}>
      <View style={{ gap: 6 }}>
        <Txt serif style={{ fontSize: 32, lineHeight: 40 }}>
          Your path
        </Txt>
        <Txt muted style={{ fontSize: 12 }}>
          何冊読んだかより、どこへ進んできたか。
        </Txt>
      </View>
      <View
        style={{
          backgroundColor: "#EFF3EC",
          borderRadius: 14,
          padding: 20,
          gap: 0,
        }}
      >
        <Row style={{ gap: 13, paddingBottom: 18 }}>
          <PathNode state="current" size={22} />
          <Txt style={{ fontSize: 11, color: c.accent }}>学びの出発点</Txt>
        </Row>
        {areas.slice(0, maxAreas).map((area, index) => {
          const steps = data.enrollments.flatMap((e) => {
            const r = data.roadmaps.find(
              (r) => r.id === e.roadmapId && r.category === area,
            );
            return (
              r?.steps.map((s) => ({ id: s.id, progress: e.progress[s.id] })) ??
              []
            );
          });
          const completed = steps.filter(
            (s) => s.progress?.status === "COMPLETED",
          ).length;
          const shown = steps.slice(0, 5);
          return (
            <View
              key={area}
              style={{
                paddingLeft: 25,
                marginLeft: 10,
                borderLeftWidth: 1,
                borderColor: "#BFCFC1",
                paddingBottom: 24,
                gap: 10,
              }}
            >
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  top: 12,
                  width: 18,
                  height: 1,
                  backgroundColor: "#BFCFC1",
                }}
              />
              <Row style={{ justifyContent: "space-between" }}>
                <Txt style={{ fontSize: 15, fontWeight: "500" }}>{area}</Txt>
                <Txt muted style={{ fontSize: 10 }}>
                  {steps.length
                    ? `${completed} / ${steps.length} checkpoints`
                    : "これから辿る道"}
                </Txt>
              </Row>
              <Row style={{ gap: 0 }}>
                {(shown.length
                  ? shown
                  : Array.from({ length: 3 }, (_, i) => ({
                      id: String(i),
                      progress: undefined,
                    }))
                ).map((step, i) => (
                  <View
                    key={step.id + i}
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <PathNode
                      size={20}
                      state={
                        step.progress?.status === "COMPLETED"
                          ? "done"
                          : step.progress?.status === "READING"
                            ? "current"
                            : "next"
                      }
                    />
                    {i < (shown.length || 3) - 1 && (
                      <View
                        style={{
                          flex: 1,
                          height: 1,
                          backgroundColor:
                            step.progress?.status === "COMPLETED"
                              ? "#789782"
                              : "#C7D4C7",
                        }}
                      />
                    )}
                  </View>
                ))}
                {steps.length > 5 && (
                  <Txt muted style={{ fontSize: 10 }}>
                    +{steps.length - 5}
                  </Txt>
                )}
              </Row>
            </View>
          );
        })}
        {maxAreas && areas.length > maxAreas ? (
          <Txt muted style={{ fontSize: 11 }}>
            ほか {areas.length - maxAreas} 領域を探索中
          </Txt>
        ) : null}
        {!areas.length && (
          <Txt muted style={{ fontSize: 12 }}>
            Roadmapを選ぶと、ここから道が分かれていきます。
          </Txt>
        )}
        <Row style={{ gap: 16, marginTop: 8, flexWrap: "wrap" }}>
          <Row style={{ gap: 5 }}>
            <PathNode state="done" size={13} />
            <Txt muted style={{ fontSize: 10 }}>
              辿った
            </Txt>
          </Row>
          <Row style={{ gap: 5 }}>
            <PathNode state="current" size={13} />
            <Txt muted style={{ fontSize: 10 }}>
              進行中
            </Txt>
          </Row>
          <Row style={{ gap: 5 }}>
            <PathNode size={13} />
            <Txt muted style={{ fontSize: 10 }}>
              これから
            </Txt>
          </Row>
        </Row>
      </View>
    </View>
  );
}
