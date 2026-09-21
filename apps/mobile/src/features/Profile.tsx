import { LearningTerrain } from "@/components/LearningTerrain";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowRight, Settings2, Share2 } from "lucide-react-native";
import { useTadori } from "@/hooks/useTadori";
import {
  Avatar,
  Button,
  Card,
  DataError,
  Empty,
  ErrorMessage,
  IconButton,
  Loading,
  PageTitle,
  Progress,
  Row,
  Screen,
  Txt,
} from "@/components/ui";
import { RoadmapCard } from "@/components/RoadmapCard";
import { colors as c } from "@/lib/theme";
import { summary } from "@/lib/progress";
function SectionTitle({ children }: { children: string }) {
  return (
    <Txt
      style={{
        fontSize: 18,
        lineHeight: 26,
        fontWeight: "500",
        letterSpacing: -0.3,
      }}
    >
      {children}
    </Txt>
  );
}

export default function Profile() {
  const { username } = useLocalSearchParams<{ username?: string }>();
  const q = useTadori();
  if (q.isPending) return <Loading />;
  if (!q.data) return <DataError retry={() => q.refetch()} />;
  const d = q.data;
  const p = d.profile;
  if (username && username !== p.username) {
    const created = d.roadmaps.filter(
      (r) => r.creatorUsername === username && r.visibility === "PUBLIC",
    );
    return (
      <Screen back title="LEARNING PROFILE">
        {created.length ? (
          <>
            <PageTitle eyebrow={`@${username}`} title={created[0].creator} />
            <SectionTitle>Created roadmaps</SectionTitle>
            {created.map((r) => (
              <RoadmapCard key={r.id} roadmap={r} books={d.books} />
            ))}
          </>
        ) : (
          <Empty
            title="Profileが見つかりません"
            description="ユーザー名を確認してください。"
          />
        )}
      </Screen>
    );
  }
  const enrolled = d.enrollments
    .map((e) => ({ e, r: d.roadmaps.find((r) => r.id === e.roadmapId)! }))
    .filter((v) => !!v.r);
  const active = enrolled.filter((v) => !summary(v.r, v.e).complete);
  const completed = enrolled.filter((v) => summary(v.r, v.e).complete);
  const booksDone = new Set(
    enrolled.flatMap(({ r, e }) =>
      r.steps
        .filter((s) => e.progress[s.id]?.status === "COMPLETED")
        .map((s) => s.bookId),
    ),
  ).size;
  const created = d.roadmaps.filter((r) => r.creatorUsername === p.username);
  return (
    <Screen
      back={!!username}
      refreshing={q.isRefetching}
      onRefresh={() => q.refetch()}
    >
      <Row style={{ justifyContent: "space-between" }}>
        <Txt muted style={{ fontSize: 13, lineHeight: 20, fontWeight: "500" }}>
          Learning profile
        </Txt>
        <IconButton label="設定" onPress={() => router.push("/settings")}>
          <Settings2 size={21} color={c.ink} />
        </IconButton>
      </Row>
      <View style={{ gap: 16 }}>
        <Row style={{ gap: 14 }}>
          <Avatar name={p.name || "T"} size={54} />
          <View style={{ flex: 1, gap: 3 }}>
            <Txt style={{ fontSize: 23, lineHeight: 31, fontWeight: "500" }}>
              {p.name || "Your name"}
            </Txt>
            <Txt muted style={{ fontSize: 12 }}>
              @{p.username || "your_username"}
            </Txt>
          </View>
          <IconButton
            label="プロフィールを共有"
            onPress={() => router.push("/profile/share")}
          >
            <Share2 size={19} color={c.accent} />
          </IconButton>
        </Row>
        <Txt muted style={{ fontSize: 13 }}>
          {p.bio}
        </Txt>
      </View>
      <LearningTerrain data={d} />
      <Row
        style={{
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: c.line,
          paddingVertical: 15,
        }}
      >
        <View style={{ flex: 1, gap: 5, alignItems: "center" }}>
          <Txt serif style={{ fontSize: 24, lineHeight: 32 }}>
            {booksDone}
          </Txt>
          <Txt muted style={{ fontSize: 11, lineHeight: 18 }}>
            Books completed
          </Txt>
        </View>
        <View style={{ width: 1, height: 32, backgroundColor: c.line }} />
        <View style={{ flex: 1, gap: 5, alignItems: "center" }}>
          <Txt serif style={{ fontSize: 24, lineHeight: 32 }}>
            {completed.length}
          </Txt>
          <Txt muted style={{ fontSize: 11, lineHeight: 18 }}>
            Roadmaps completed
          </Txt>
        </View>
      </Row>
      {[
        { title: "Current roadmaps", items: active },
        { title: "Completed roadmaps", items: completed },
      ].map((group) => (
        <View key={group.title} style={{ gap: 14 }}>
          <SectionTitle>{group.title}</SectionTitle>
          {group.items.map(({ r, e }) => (
            <Pressable
              key={r.id}
              accessibilityRole="button"
              accessibilityLabel={r.title}
              onPress={() => router.push(`/roadmaps/${r.slug}`)}
            >
              <Card style={{ padding: 16 }}>
                <Row>
                  <View style={{ flex: 1, gap: 8 }}>
                    <Txt serif style={{ fontSize: 21, lineHeight: 27 }}>
                      {r.title}
                    </Txt>
                    <Txt muted style={{ fontSize: 11 }}>
                      {summary(r, e).done} / {r.steps.length} books completed
                    </Txt>
                  </View>
                  <ArrowRight size={17} color={c.accent} />
                </Row>
                <Progress thin value={summary(r, e).percentage} />
              </Card>
            </Pressable>
          ))}
          {!group.items.length && (
            <Txt muted style={{ fontSize: 12 }}>
              {group.title === "Current roadmaps"
                ? "今は進行中のRoadmapがありません。"
                : "ここに、辿りきった道が増えていきます。"}
            </Txt>
          )}
        </View>
      ))}
      <View style={{ gap: 14 }}>
        <SectionTitle>Created roadmaps</SectionTitle>
        {created.map((r) => (
          <RoadmapCard key={r.id} roadmap={r} books={d.books} />
        ))}
        {!created.length && (
          <Txt muted style={{ fontSize: 12 }}>
            あなたの知識も、誰かの道しるべに。
          </Txt>
        )}
      </View>
      {!p.onboarded && (
        <Button
          title="プロフィールを設定する"
          onPress={() => router.push("/onboarding")}
        />
      )}
    </Screen>
  );
}
