import { JourneyCoach } from "@/components/JourneyCoach";
import { AppHeader } from "@/components/AppHeader";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { ArrowUpRight, CalendarDays, Plus } from "lucide-react-native";
import { useTadori } from "@/hooks/useTadori";
import {
  Avatar,
  Cover,
  DataError,
  Empty,
  IconButton,
  Loading,
  Row,
  Screen,
  Txt,
} from "@/components/ui";
import { PeoplePath } from "@/components/PeoplePath";
import { colors as c } from "@/lib/theme";
export function meetingLabel(value: string) {
  return value
    ? new Date(value).toLocaleString("ja-JP", {
        month: "short",
        day: "numeric",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "日程調整中";
}
export default function Circles() {
  const q = useTadori();
  if (q.isPending) return <Loading />;
  if (!q.data) return <DataError retry={() => q.refetch()} />;
  const d = q.data;
  const circles = d.circles.filter(
    (c) => c.visibility === "PUBLIC" || c.members.includes(d.profile.name),
  );
  return (
    <Screen gap={22} refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
      <AppHeader
        title="Circles"
        description="ひとりの一歩が、みんなの続きに。"
        action={
          <IconButton
            label="Circleを作成"
            onPress={() => router.push("/circles/new")}
          >
            <Plus size={23} color={c.accent} />
          </IconButton>
        }
      />
      <JourneyCoach screen="circles" />
      {circles.map((circle) => {
        const roadmap = d.roadmaps.find((r) => r.id === circle.targetId);
        const book = d.books.find(
          (b) =>
            b.id ===
            (circle.targetType === "Book"
              ? circle.targetId
              : roadmap?.steps[circle.currentStep]?.bookId),
        );

        return (
          <Pressable
            key={circle.id}
            accessibilityRole="button"
            accessibilityLabel={circle.name}
            onPress={() => router.push(`/circles/${circle.id}`)}
            style={{
              borderWidth: 1,
              borderColor: c.line,
              backgroundColor: c.white,
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <View style={{ padding: 20, gap: 18 }}>
              <Row style={{ justifyContent: "space-between" }}>
                <Row style={{ gap: 0 }}>
                  {circle.members.slice(0, 4).map((name, i) => (
                    <View key={name + i} style={{ marginLeft: i ? -8 : 0 }}>
                      <Avatar name={name} size={44} />
                    </View>
                  ))}
                </Row>
                <View style={{ alignItems: "flex-end", gap: 2 }}>
                  <Txt style={{ fontSize: 16, fontWeight: "500" }}>
                    {circle.members.length}{" "}
                    <Txt muted style={{ fontSize: 12 }}>
                      / {circle.maxMembers} members
                    </Txt>
                  </Txt>
                </View>
              </Row>
              <Row>
                <Txt serif style={{ fontSize: 22, lineHeight: 29, flex: 1 }}>
                  {circle.name}
                </Txt>
                <ArrowUpRight size={16} color={c.accent} />
              </Row>
              {book && (
                <Row
                  style={{
                    gap: 14,
                    paddingTop: 0,
                  }}
                >
                  <Cover book={book} width={52} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Txt muted style={{ fontSize: 10 }}>
                      いま一緒に読む本
                    </Txt>
                    <Txt
                      style={{
                        fontSize: 16,
                        fontWeight: "500",
                        lineHeight: 24,
                      }}
                    >
                      {book.title}
                    </Txt>
                  </View>
                </Row>
              )}
              <PeoplePath circle={circle} data={d} compact />
            </View>
            <Row
              style={{
                backgroundColor: c.wash,
                paddingHorizontal: 20,
                paddingVertical: 14,
                gap: 12,
              }}
            >
              <CalendarDays size={19} color={c.accent} />
              <View style={{ flex: 1, gap: 1 }}>
                <Txt muted style={{ fontSize: 10 }}>
                  Next meeting
                </Txt>
                <Txt
                  style={{
                    fontSize: 14,
                    lineHeight: 22,
                    fontWeight: "500",
                    color: c.accent,
                  }}
                >
                  {meetingLabel(circle.meeting)}
                </Txt>
              </View>
            </Row>
          </Pressable>
        );
      })}
      {!circles.length && (
        <Empty
          title="最初の輪をつくる"
          description="同じ本を読む仲間と、学びを始めましょう。"
          action="Create Circle"
          onPress={() => router.push("/circles/new")}
        />
      )}
    </Screen>
  );
}
