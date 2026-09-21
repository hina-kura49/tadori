import { FirstPath } from "@/components/FirstPath";
import { PathRail, PathNode } from "@/components/Path";
import { View, Pressable } from "react-native";
import { router } from "expo-router";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  Flag,
  Route,
} from "lucide-react-native";
import { useTadori, useAction } from "@/hooks/useTadori";
import { repository } from "@/api/repository";
import {
  Avatar,
  Button,
  Card,
  Cover,
  DataError,
  Empty,
  ErrorMessage,
  IconButton,
  Label,
  Loading,
  PageTitle,
  Progress,
  Row,
  Screen,
  Separator,
  Txt,
} from "@/components/ui";
import { colors as c } from "@/lib/theme";
import { summary } from "@/lib/progress";
export default function Today() {
  const q = useTadori();
  const primary = useAction(repository.setPrimary);
  if (q.isPending) return <Loading />;
  if (!q.data) return <DataError retry={() => q.refetch()} />;
  const d = q.data;
  const active = d.enrollments.filter((e) => {
    const r = d.roadmaps.find((r) => r.id === e.roadmapId);
    return r && !summary(r, e).complete;
  });
  const enrollment = active[0];
  const roadmap = d.roadmaps.find((r) => r.id === enrollment?.roadmapId);
  const s = roadmap ? summary(roadmap, enrollment) : null;
  const book = d.books.find((b) => b.id === s?.current?.bookId);
  const next =
    roadmap && s
      ? d.books.find((b) => b.id === roadmap.steps[s.index + 1]?.bookId)
      : undefined;
  const percentage = s?.current
    ? (enrollment?.progress[s.current.id]?.percentage ?? 0)
    : 0;
  const date = new Date()
    .toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      weekday: "long",
    })
    .toUpperCase();
  const hour = new Date().getHours();
  return (
    <Screen gap={14} refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
      <Row style={{ justifyContent: "space-between" }}>
        <Row style={{ gap: 8 }}>
          <Route color={c.accent} size={23} />
          <Txt serif style={{ fontSize: 30, letterSpacing: -1 }}>
            tadori
          </Txt>
        </Row>
        <Row style={{ gap: 5 }}>
          <IconButton
            label="通知設定"
            onPress={() => router.push("/settings/notifications")}
          >
            <Bell size={20} color={c.ink} />
          </IconButton>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="プロフィール"
            onPress={() => router.push("/me")}
          >
            <Avatar name={d.profile.name || "T"} size={34} />
          </Pressable>
        </Row>
      </Row>
      <View style={{ gap: 6 }}>
        <Txt
          serif
          style={{ fontSize: 30, lineHeight: 36, letterSpacing: -0.7 }}
        >
          {hour < 12
            ? "Good morning."
            : hour < 18
              ? "A little further, today."
              : "Good evening."}
        </Txt>
        <Txt muted style={{ fontSize: 12 }}>
          今日の一歩が、明日のあなたにつながる。
        </Txt>
      </View>
      {roadmap && book && s?.current ? (
        <>
          <View style={{ gap: 8 }}>
            <Row style={{ justifyContent: "space-between" }}>
              <Txt muted style={{ fontSize: 12 }}>
                Your path
              </Txt>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Roadmapを見る"
                onPress={() => router.push(`/roadmaps/${roadmap.slug}`)}
              >
                <ArrowUpRight size={19} color={c.accent} />
              </Pressable>
            </Row>
            <Txt serif style={{ fontSize: 24, lineHeight: 28 }}>
              {roadmap.title}
            </Txt>
            <PathRail
              count={roadmap.steps.length}
              current={s.index}
              completed={roadmap.steps.flatMap((step, i) =>
                enrollment.progress[step.id]?.status === "COMPLETED" ? [i] : [],
              )}
            />
            <Row style={{ justifyContent: "space-between" }}>
              <Txt muted style={{ fontSize: 11 }}>
                {s.done} / {roadmap.steps.length} books completed
              </Txt>
              <Txt style={{ fontSize: 11, color: c.accent }}>
                一歩ずつ、着実に。
              </Txt>
            </Row>
          </View>
          <Card style={{ padding: 0, overflow: "hidden", gap: 0 }}>
            <View
              style={{
                backgroundColor: c.wash,
                paddingHorizontal: 16,
                paddingVertical: 9,
              }}
            >
              <Row style={{ justifyContent: "space-between" }}>
                <Row style={{ gap: 8 }}>
                  <PathNode state="current" size={18} />
                  <Txt
                    style={{ fontSize: 12, color: c.accent, fontWeight: "500" }}
                  >
                    いま、ここ
                  </Txt>
                </Row>
                <Txt style={{ fontSize: 10, color: c.accent }}>
                  STEP {String(s.index + 1).padStart(2, "0")}
                </Txt>
              </Row>
            </View>
            <View style={{ padding: 16, gap: 14 }}>
              <Row style={{ alignItems: "center", gap: 16 }}>
                <Cover book={book} width={80} />
                <View style={{ flex: 1, gap: 8 }}>
                  <Txt
                    style={{ fontSize: 17, lineHeight: 25, fontWeight: "600" }}
                  >
                    {book.title}
                  </Txt>
                  <Txt muted style={{ fontSize: 11 }}>
                    {book.author}
                  </Txt>
                  <View style={{ gap: 7, paddingTop: 3 }}>
                    <Row style={{ justifyContent: "space-between" }}>
                      <Txt muted style={{ fontSize: 10 }}>
                        {percentage === 0 ? "READY TO BEGIN" : "READING"}
                      </Txt>
                      <Txt
                        style={{
                          fontSize: 20,
                          color: c.accent,
                          fontWeight: "500",
                        }}
                      >
                        {percentage}
                        <Txt muted style={{ fontSize: 11 }}>
                          {" "}
                          %
                        </Txt>
                      </Txt>
                    </Row>
                    <Progress value={percentage} />
                  </View>
                </View>
              </Row>
              <Button
                title={percentage === 0 ? "Start Reading" : "Continue"}
                onPress={() =>
                  router.push({
                    pathname: "/books/[id]",
                    params: {
                      id: book.id,
                      roadmapId: roadmap.id,
                      stepId: s.current!.id,
                    },
                  })
                }
              />
              <View
                style={{
                  borderLeftWidth: 2,
                  borderColor: "#9CAF9F",
                  paddingLeft: 13,
                  gap: 4,
                }}
              >
                <Label>CHECKPOINT</Label>
                <Txt style={{ fontSize: 12, lineHeight: 21 }}>
                  {s.current.checkpoint}
                </Txt>
              </View>
            </View>
          </Card>
          {next && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`次の本：${next.title}`}
              onPress={() => router.push(`/roadmaps/${roadmap.slug}`)}
            >
              <Row style={{ gap: 16 }}>
                <View style={{ paddingLeft: 3 }}>
                  <Cover book={next} width={36} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt muted style={{ fontSize: 11 }}>
                    Next step
                  </Txt>
                  <Txt style={{ fontSize: 13 }}>{next.title}</Txt>
                </View>
                <ArrowRight size={17} color={c.muted} />
              </Row>
            </Pressable>
          )}
          <Separator />
          {active.length > 1 && (
            <View style={{ gap: 13 }}>
              <Txt style={{ fontSize: 16, fontWeight: "500" }}>Other paths</Txt>
              {active.slice(1).map((e) => {
                const r = d.roadmaps.find((r) => r.id === e.roadmapId)!;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => primary.mutate(r.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${r.title}をメインにする`}
                  >
                    <Row style={{ justifyContent: "space-between" }}>
                      <Txt serif style={{ fontSize: 17, flex: 1 }}>
                        {r.title}
                      </Txt>
                      <ArrowRight size={16} color={c.accent} />
                    </Row>
                  </Pressable>
                );
              })}
              <ErrorMessage error={primary.error} />
            </View>
          )}
          <Row style={{ justifyContent: "center", paddingVertical: 4 }}>
            <Route size={15} color="#A1AAA2" />
            <Txt muted style={{ fontSize: 11 }}>
              速さよりも、昨日より少し先へ。
            </Txt>
          </Row>
        </>
      ) : (
        <FirstPath completed={d.enrollments.length > 0} />
      )}
    </Screen>
  );
}
