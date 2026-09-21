import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { ArrowUpRight, Route, Users } from "lucide-react-native";
import { Row, Screen, Txt } from "@/components/ui";
import { colors as c } from "@/lib/theme";
export default function Create() {
  const [pressed, setPressed] = useState<string | null>(null);
  return (
    <Screen gap={16}>
      <Txt style={{ fontSize: 20, lineHeight: 28, fontWeight: "500" }}>
        Create
      </Txt>
      <View style={{ minHeight: 420, justifyContent: "center", gap: 28 }}>
        <View style={{ gap: 9 }}>
          <Txt serif style={{ fontSize: 31, lineHeight: 39 }}>
            What would you{`\n`}like to create?
          </Txt>
          <Txt muted style={{ fontSize: 13 }}>
            学びの道をつくる。仲間と道をつなぐ。
          </Txt>
        </View>
        <View style={{ gap: 12 }}>
          {[
            {
              title: "Roadmap",
              description: "本とCheckpointを、ひとつの道に。",
              Icon: Route,
              href: "/roadmaps/new" as const,
              label: "Roadmapをつくる",
            },
            {
              title: "Circle",
              description: "同じ道を進む、小さな学びの輪。",
              Icon: Users,
              href: "/circles/new" as const,
              label: "Circleをつくる",
            },
          ].map(({ title, description, Icon, href, label }) => (
            <Pressable
              key={title}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPressIn={() => setPressed(title)}
              onPressOut={() => setPressed(null)}
              onPress={() => {
                setPressed(null);
                router.push(href);
              }}
              style={{
                paddingVertical: 20,
                paddingHorizontal: 18,
                borderRadius: 14,
                backgroundColor: pressed === title ? "#DFE9E3" : c.wash,
                borderWidth: 1,
                borderColor: pressed === title ? "#B5CBC0" : "#E5ECE7",
              }}
            >
              <Row style={{ gap: 17 }}>
                <Icon size={23} color={c.accent} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt
                    style={{ fontSize: 19, lineHeight: 27, fontWeight: "500" }}
                  >
                    {title}
                  </Txt>
                  <Txt muted style={{ fontSize: 12, lineHeight: 20 }}>
                    {description}
                  </Txt>
                </View>
                <ArrowUpRight size={19} color={c.accent} />
              </Row>
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}
