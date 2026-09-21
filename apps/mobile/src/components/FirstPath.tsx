import { View } from "react-native";
import { router } from "expo-router";
import { Button, Row, Txt } from "./ui";
import { PathNode } from "./Path";
import { colors as c } from "@/lib/theme";
export function FirstPath({ completed = false }: { completed?: boolean }) {
  return (
    <View style={{ paddingVertical: 22, gap: 26 }}>
      <View style={{ gap: 10 }}>
        <Txt serif style={{ fontSize: 32, lineHeight: 41 }}>
          {completed ? "The path goes on." : "ここから、道になる。"}
        </Txt>
        <Txt muted style={{ fontSize: 13, lineHeight: 23 }}>
          {completed
            ? "辿った道が、あなたの力になりました。\n次の道で、学びをつなげていきましょう。"
            : "最初の1本を選ぶと、ここに\nあなたの学びの道が伸びていきます。"}
        </Txt>
      </View>
      <View style={{ paddingVertical: 6 }}>
        {[
          {
            title: completed ? "辿ってきた道" : "いま、ここ",
            sub: completed
              ? "積み重ねたCheckpointを次の一歩へ。"
              : "何を学びたいか。その気持ちが始点。",
            state: "done" as const,
          },
          {
            title: completed ? "次のRoadmapを選ぶ" : "最初のRoadmapを選ぶ",
            sub: "誰かがつないだ本と、到達目標を見つける。",
            state: "current" as const,
          },
          {
            title: "一冊目のCheckpointへ",
            sub: "読む。その先に、できることが増える。",
            state: "next" as const,
          },
        ].map((step, i) => (
          <Row key={step.title} style={{ alignItems: "stretch", gap: 20 }}>
            <View style={{ width: 30, alignItems: "center" }}>
              <PathNode state={step.state} size={28} />
              {i < 2 && (
                <View
                  style={{
                    width: 1,
                    flex: 1,
                    minHeight: 52,
                    backgroundColor: "#CBD8CE",
                  }}
                />
              )}
            </View>
            <View style={{ flex: 1, gap: 5, paddingBottom: i < 2 ? 32 : 4 }}>
              <Txt
                style={{
                  fontSize: 16,
                  lineHeight: 25,
                  fontWeight: i === 1 ? "600" : "400",
                  color: i === 1 ? c.accent : c.ink,
                }}
              >
                {step.title}
              </Txt>
              <Txt muted style={{ fontSize: 12, lineHeight: 21 }}>
                {step.sub}
              </Txt>
            </View>
          </Row>
        ))}
      </View>
      <Button
        title={completed ? "次の道を見つける" : "最初のRoadmapを選ぶ"}
        onPress={() => router.push("/explore")}
      />
    </View>
  );
}
