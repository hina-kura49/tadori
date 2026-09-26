import { JourneyCoach } from "@/components/JourneyCoach";
import { PeoplePath } from "@/components/PeoplePath";
import { useState } from "react";
import { Share, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { CalendarDays, Share2, Users } from "lucide-react-native";
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
  Txt,
} from "@/components/ui";
import { colors as c } from "@/lib/theme";
import { shareUrl } from "@/lib/links";
import { meetingLabel } from "./Circles";
export default function CircleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useTadori();
  const join = useAction(repository.joinCircle);
  const [error, setError] = useState<unknown>();
  if (q.isPending) return <Loading />;
  if (!q.data) return <DataError retry={() => q.refetch()} />;
  const d = q.data;
  const circle = d.circles.find((c) => c.id === id);
  if (!circle)
    return (
      <Screen back>
        <Empty
          title="Circleが見つかりません"
          description="リンクを確認してください。"
        />
      </Screen>
    );
  const r = d.roadmaps.find((r) => r.id === circle.targetId);
  const book = d.books.find(
    (b) =>
      b.id ===
      (circle.targetType === "Book"
        ? circle.targetId
        : r?.steps[circle.currentStep]?.bookId),
  );
  const joined = circle.members.includes(d.profile.name);
  return (
    <Screen
      back
      title="THE LEARNING CIRCLE"
      refreshing={q.isRefetching}
      onRefresh={() => q.refetch()}
    >
      <JourneyCoach screen="circles" />
      <Row
        style={{ justifyContent: "space-between", alignItems: "flex-start" }}
      >
        <View style={{ flex: 1 }}>
          <PageTitle
            eyebrow={
              circle.visibility === "PUBLIC" ? "OPEN CIRCLE" : "INVITE ONLY"
            }
            title={circle.name}
          />
        </View>
        <IconButton
          label="Circleを共有"
          onPress={async () => {
            try {
              await Share.share({
                message: `${circle.name}\n${shareUrl("circles", circle.id)}`,
              });
            } catch (err) {
              setError(err);
            }
          }}
        >
          <Share2 size={20} color={c.accent} />
        </IconButton>
      </Row>
      <Txt muted>
        {circle.targetType} · {r?.title ?? book?.title}
      </Txt>
      <PeoplePath circle={circle} data={d} />
      <Card style={{ backgroundColor: c.wash, borderWidth: 0 }}>
        <Label>
          CURRENT{" "}
          {circle.targetType === "Book"
            ? "BOOK"
            : `STEP ${circle.currentStep + 1}`}
        </Label>
        {book && (
          <Row style={{ gap: 22 }}>
            <Cover book={book} width={72} />
            <View style={{ flex: 1, gap: 10 }}>
              <Txt style={{ fontSize: 18, fontWeight: "500", lineHeight: 27 }}>
                {book.title}
              </Txt>
              <Txt muted style={{ fontSize: 11 }}>
                {book.author}
              </Txt>
              <Progress value={circle.progress} />
              <Txt style={{ fontSize: 12, color: c.accent }}>
                {circle.progress}% · Circle progress
              </Txt>
            </View>
          </Row>
        )}
        {r && (
          <Button
            secondary
            title="Roadmapを見る"
            onPress={() => router.push(`/roadmaps/${r.slug}`)}
          />
        )}
      </Card>
      <Card>
        <Row>
          <CalendarDays size={21} color={c.accent} />
          <Label>NEXT MEETING</Label>
        </Row>
        <Txt serif style={{ fontSize: 25, lineHeight: 32 }}>
          {meetingLabel(circle.meeting)}
        </Txt>
        <Txt muted style={{ fontSize: 11 }}>
          活動期間 · {circle.startDate} → {circle.endDate}
        </Txt>
      </Card>
      <View style={{ gap: 16 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <Label>MEMBERS</Label>
          <Txt muted style={{ fontSize: 11 }}>
            {circle.members.length} / {circle.maxMembers}
          </Txt>
        </Row>
        <Row style={{ flexWrap: "wrap", gap: 18 }}>
          {circle.members.map((m, i) => (
            <View key={m + i} style={{ alignItems: "center", gap: 6 }}>
              <Avatar name={m} size={44} />
              <Txt muted style={{ fontSize: 11 }}>
                {m}
              </Txt>
            </View>
          ))}
        </Row>
      </View>
      <Card>
        <Label>ANNOUNCEMENT</Label>
        <Txt style={{ fontSize: 13, lineHeight: 24 }}>
          {circle.announcement}
        </Txt>
      </Card>
      <ErrorMessage error={join.error || error} />
      <Button
        title={
          joined
            ? "参加しています"
            : circle.visibility === "INVITE_ONLY"
              ? "参加には招待が必要です"
              : circle.members.length >= circle.maxMembers
                ? "満員です"
                : "このCircleに参加する"
        }
        disabled={
          joined ||
          circle.visibility === "INVITE_ONLY" ||
          circle.members.length >= circle.maxMembers
        }
        loading={join.isPending}
        onPress={() => {
          if (!d.profile.onboarded) {
            router.push("/onboarding");
            return;
          }
          join.mutate(circle.id);
        }}
      />
    </Screen>
  );
}
