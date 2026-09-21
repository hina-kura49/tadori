import { Pressable, View, useWindowDimensions } from "react-native";
import { ArrowRight } from "lucide-react-native";
import { router } from "expo-router";
import { Book, Enrollment, Roadmap } from "@/types/domain";
import { Avatar, Cover, Row, Txt } from "./ui";
import { PathRail } from "./Path";
import { colors as c } from "@/lib/theme";
import { summary } from "@/lib/progress";
export function RoadmapCard({
  roadmap,
  books,
  enrollment,
}: {
  roadmap: Roadmap;
  books: Book[];
  enrollment?: Enrollment;
}) {
  const { width } = useWindowDimensions();
  const s = summary(roadmap, enrollment);
  const shown = roadmap.steps.slice(0, 4);
  const coverWidth = Math.max(
    46,
    Math.min(80, (Math.min(width, 720) - 88) / shown.length - 10),
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={roadmap.title}
      onPress={() => router.push(`/roadmaps/${roadmap.slug}`)}
      style={{
        borderWidth: 1,
        borderColor: c.line,
        borderRadius: 14,
        backgroundColor: c.white,
        overflow: "hidden",
      }}
    >
      <View style={{ padding: 20, paddingBottom: 16, gap: 14 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <Txt style={{ fontSize: 11, color: c.accent, fontWeight: "500" }}>
            {roadmap.category}
          </Txt>
          <Txt muted style={{ fontSize: 11 }}>
            {roadmap.steps.length} steps · {roadmap.duration}
          </Txt>
        </Row>
        <Txt serif style={{ fontSize: 25, lineHeight: 30 }}>
          {roadmap.title}
        </Txt>
      </View>
      <View
        style={{
          backgroundColor: "#F0F3ED",
          paddingHorizontal: 16,
          paddingVertical: 22,
          gap: 16,
        }}
      >
        <Row style={{ gap: 0, alignItems: "flex-end" }}>
          {shown.map((step) => {
            const book = books.find((b) => b.id === step.bookId);
            return (
              <View key={step.id} style={{ flex: 1, alignItems: "center" }}>
                {book && <Cover book={book} width={coverWidth} />}
              </View>
            );
          })}
        </Row>
        <PathRail
          count={shown.length}
          current={enrollment ? s.index : -1}
          completed={shown.flatMap((s, i) =>
            enrollment?.progress[s.id]?.status === "COMPLETED" ? [i] : [],
          )}
        />
        {roadmap.steps.length > 4 && (
          <Txt muted style={{ fontSize: 11, textAlign: "right" }}>
            さらに {roadmap.steps.length - 4} steps →
          </Txt>
        )}
      </View>
      <View style={{ padding: 20, gap: 14 }}>
        <Txt muted style={{ fontSize: 12, lineHeight: 21 }}>
          {roadmap.description}
        </Txt>
        <Row style={{ justifyContent: "space-between" }}>
          <Txt muted style={{ fontSize: 11 }}>
            {roadmap.difficulty} · {roadmap.completedUsers}人が完走
          </Txt>
          {enrollment && (
            <Txt style={{ fontSize: 11, color: c.accent }}>
              {s.done}/{roadmap.steps.length} completed
            </Txt>
          )}
        </Row>
        <Row
          style={{
            justifyContent: "space-between",
            paddingTop: 14,
            borderTopWidth: 1,
            borderColor: c.line,
          }}
        >
          <Row style={{ gap: 7, flex: 1 }}>
            <Avatar name={roadmap.creator} size={25} />
            <Txt muted style={{ fontSize: 11 }}>
              {roadmap.creator}
            </Txt>
          </Row>
          <Row style={{ gap: 8 }}>
            <Txt style={{ fontSize: 13, color: c.accent, fontWeight: "500" }}>
              See path
            </Txt>
            <ArrowRight size={16} color={c.accent} />
          </Row>
        </Row>
      </View>
    </Pressable>
  );
}
