import { useJourney } from "@/hooks/useJourney";
import { Pressable, Share, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Flag,
  LockKeyhole,
  Share2,
} from "lucide-react-native";
import { useAction, useTadori } from "@/hooks/useTadori";
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
  Progress,
  Row,
  Screen,
  Txt,
} from "@/components/ui";
import { colors as c } from "@/lib/theme";
import { stepState, summary } from "@/lib/progress";
import { shareUrl } from "@/lib/links";
import { useState } from "react";
export default function RoadmapDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const q = useTadori();
  const tour = useJourney();
  const enroll = useAction(repository.enroll);
  const primary = useAction(repository.setPrimary);
  const [error, setError] = useState<unknown>();
  if (q.isPending) return <Loading />;
  if (!q.data) return <DataError retry={() => q.refetch()} />;
  const d = q.data;
  const r = d.roadmaps.find((r) => r.slug === slug || r.id === slug);
  if (!r)
    return (
      <Screen back>
        <Empty
          title="道が見つかりませんでした"
          description="リンクを確認するか、Exploreから探してみてください。"
          action="Exploreへ"
          onPress={() => router.replace("/explore")}
        />
      </Screen>
    );
  const e = d.enrollments.find((e) => e.roadmapId === r.id);
  const s = summary(r, e);
  const open = (i: number) =>
    router.push({
      pathname: "/books/[id]",
      params: { id: r.steps[i].bookId, roadmapId: r.id, stepId: r.steps[i].id },
    });
  return (
    <Screen
      back
      title="THE LEARNING PATH"
      refreshing={q.isRefetching}
      onRefresh={() => q.refetch()}
    >
      <View style={{ gap: 16, paddingTop: 20 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <Label>{r.category.toUpperCase()}</Label>
          <IconButton
            label="Roadmapを共有"
            onPress={async () => {
              try {
                await Share.share({
                  message: `${r.title}\n${shareUrl("r", r.slug)}`,
                });
              } catch (err) {
                setError(err);
              }
            }}
          >
            <Share2 size={19} color={c.accent} />
          </IconButton>
        </Row>
        <Txt
          serif
          style={{ fontSize: 35, lineHeight: 41, letterSpacing: -0.5 }}
        >
          {r.title}
        </Txt>
        <Txt muted style={{ fontSize: 13, lineHeight: 23 }}>
          {r.description}
        </Txt>
        <Row style={{ gap: 8 }}>
          <Avatar name={r.creator} />
          <Txt muted style={{ fontSize: 12 }}>
            A path by {r.creator}
          </Txt>
        </Row>
        <Row style={{ flexWrap: "wrap", gap: 10 }}>
          <BookOpen size={14} color={c.muted} />
          <Txt muted style={{ fontSize: 11 }}>
            {r.steps.length} books
          </Txt>
          <Txt muted style={{ fontSize: 11 }}>
            · {r.difficulty}
          </Txt>
          <Clock3 size={13} color={c.muted} />
          <Txt muted style={{ fontSize: 11 }}>
            {r.duration}
          </Txt>
        </Row>
        {e && (
          <>
            <Progress value={s.percentage} />
            <Txt style={{ fontSize: 11, color: c.accent }}>
              {s.done} / {r.steps.length} books completed · {s.percentage}%
            </Txt>
          </>
        )}
        <ErrorMessage error={enroll.error || tour.error || error} />
        <Button
          title={
            s.complete
              ? "Roadmap completed"
              : e
                ? "Continue Roadmap"
                : tour.state.stage === "explore"
                  ? "Start this path"
                  : "Start Roadmap"
          }
          disabled={s.complete}
          loading={enroll.isPending || primary.isPending || tour.busy}
          onPress={async () => {
            if (!d.profile.onboarded) {
              router.push("/onboarding");
              return;
            }
            try {
              if (!e) await enroll.mutateAsync(r.id);
              if (tour.state.stage === "explore") {
                await primary.mutateAsync(r.id);
                await tour.set({
                  ...tour.state,
                  stage: "today",
                  roadmapId: r.id,
                });
                router.replace("/");
              } else open(Math.max(0, s.index));
            } catch (err) {
              setError(err);
            }
          }}
        />
      </View>
      <View style={{ gap: 0, paddingTop: 8 }}>
        <Row style={{ gap: 18, marginBottom: 18 }}>
          <View style={{ width: 34, alignItems: "center" }}>
            <Flag size={17} color={c.accent} />
          </View>
          <Label>YOUR PATH STARTS HERE</Label>
        </Row>
        {r.steps.map((step, i) => {
          const state = stepState(r, i, e);
          const current = state === "CURRENT";
          const done = state === "COMPLETED";
          const b = d.books.find((b) => b.id === step.bookId)!;
          return (
            <View key={step.id} style={{ flexDirection: "row", gap: 16 }}>
              <View style={{ width: 34, alignItems: "center" }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: done || current ? c.accent : c.paper,
                    borderWidth: current ? 4 : 1,
                    borderColor: current
                      ? "#C6D5CB"
                      : done
                        ? c.accent
                        : "#CED2CC",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {done ? (
                    <Check size={16} color="white" />
                  ) : current ? (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "white",
                      }}
                    />
                  ) : (
                    <Txt style={{ fontSize: 11, color: c.muted }}>
                      {String(i + 1).padStart(2, "0")}
                    </Txt>
                  )}
                </View>
                <View
                  style={{
                    width: 1,
                    flex: 1,
                    backgroundColor: done ? "#739086" : c.line,
                    minHeight: 40,
                  }}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${b.title}、${current ? "現在地" : done ? "完了" : "未着手"}`}
                onPress={() => open(i)}
                style={{
                  flex: 1,
                  marginBottom: 24,
                  padding: current ? 16 : 0,
                  borderWidth: current ? 1 : 0,
                  borderColor: "#C1D0C5",
                  borderRadius: 10,
                  backgroundColor: current ? c.wash : "transparent",
                  gap: 14,
                }}
              >
                {current && <Label>● YOU ARE HERE</Label>}
                <Row style={{ gap: 14, alignItems: "flex-start" }}>
                  <Cover book={b} width={57} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Txt
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        lineHeight: 23,
                      }}
                    >
                      {b.title}
                    </Txt>
                    <Txt muted style={{ fontSize: 10, lineHeight: 16 }}>
                      {b.author}
                    </Txt>
                    <Txt muted style={{ fontSize: 10 }}>
                      {step.duration} {done ? " · Completed" : ""}
                    </Txt>
                  </View>
                </Row>
                <View style={{ gap: 4 }}>
                  <Txt
                    style={{
                      fontSize: 9,
                      fontWeight: "700",
                      letterSpacing: 1.5,
                      color: current ? c.accent : c.muted,
                    }}
                  >
                    CHECKPOINT
                  </Txt>
                  <Txt
                    style={{
                      fontSize: 12,
                      lineHeight: 21,
                      color: done ? c.muted : c.ink,
                    }}
                  >
                    {step.checkpoint}
                  </Txt>
                </View>
                {current && (
                  <Row style={{ justifyContent: "space-between" }}>
                    <Txt style={{ fontSize: 11, color: c.accent }}>
                      この一冊を進める
                    </Txt>
                    <ArrowRight size={15} color={c.accent} />
                  </Row>
                )}
              </Pressable>
            </View>
          );
        })}
        <Row style={{ gap: 18 }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              borderWidth: 1,
              borderColor: s.complete ? c.accent : c.line,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: s.complete ? c.accent : c.paper,
            }}
          >
            <Flag size={15} color={s.complete ? "white" : c.muted} />
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Label>
              {s.complete ? "YOU MADE IT." : "A NEW PERSPECTIVE AWAITS."}
            </Label>
            <Txt muted style={{ fontSize: 11 }}>
              {s.complete
                ? "辿った道が、あなたの力になりました。"
                : "最後の一冊の先に、新しい自分。"}
            </Txt>
          </View>
        </Row>
      </View>
      <Txt muted style={{ textAlign: "center", fontSize: 10 }}>
        道順はガイド。気になる本から進めても大丈夫。
      </Txt>
    </Screen>
  );
}
