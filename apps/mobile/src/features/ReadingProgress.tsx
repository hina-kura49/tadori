import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowUpRight, Check, X } from "lucide-react-native";
import { useAction, useTadori } from "@/hooks/useTadori";
import { repository } from "@/api/repository";
import {
  Button,
  Chip,
  Cover,
  DataError,
  Empty,
  ErrorMessage,
  Field,
  IconButton,
  Loading,
  Progress,
  Row,
  Screen,
  Txt,
} from "@/components/ui";
import { PathNode, PathRail } from "@/components/Path";
import { colors as c } from "@/lib/theme";
import { summary } from "@/lib/progress";
export default function ReadingProgress() {
  const { id, roadmapId, stepId } = useLocalSearchParams<{
    id: string;
    roadmapId: string;
    stepId: string;
  }>();
  const q = useTadori();
  const save = useAction(({ r, s, p }: { r: string; s: string; p: number }) =>
    repository.progress(r, s, p),
  );
  const enroll = useAction(repository.enroll);
  const [input, setInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [updated, setUpdated] = useState(false);
  if (q.isPending) return <Loading />;
  if (!q.data) return <DataError retry={() => q.refetch()} />;
  const d = q.data;
  const r = d.roadmaps.find((r) => r.id === roadmapId);
  const b = d.books.find((b) => b.id === id);
  const step = r?.steps.find((s) => s.id === stepId && s.bookId === id);
  if (!r || !b || !step)
    return (
      <Screen back>
        <Empty
          title="本が見つかりませんでした"
          description="Roadmapから本を選択してください。"
          action="Exploreへ"
          onPress={() => router.replace("/explore")}
        />
      </Screen>
    );
  const e = d.enrollments.find((e) => e.roadmapId === r.id);
  const p = e?.progress[step.id];
  const complete = p?.status === "COMPLETED";
  const reading = p?.status === "READING";
  const s = summary(r, e);
  const index = r.steps.indexOf(step);
  const update = async (n: number) => {
    try {
      await save.mutateAsync({ r: r.id, s: step.id, p: n });
      setUpdated(true);
      setEditing(false);
    } catch {}
  };
  return (
    <Screen back title={`Step ${index + 1} / ${r.steps.length}`} gap={24}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Roadmapに戻る"
        onPress={() => router.push(`/roadmaps/${r.slug}`)}
        style={{ gap: 12, paddingTop: 12 }}
      >
        <Row>
          <Txt muted style={{ fontSize: 12, lineHeight: 19, flex: 1 }}>
            {r.title}
          </Txt>
          <ArrowUpRight size={16} color={c.muted} />
        </Row>
        <PathRail
          count={r.steps.length}
          current={index}
          completed={r.steps.flatMap((step, i) =>
            e?.progress[step.id]?.status === "COMPLETED" ? [i] : [],
          )}
        />
      </Pressable>
      <Row style={{ gap: 20, alignItems: "center", paddingVertical: 8 }}>
        <Cover book={b} width={94} />
        <View style={{ flex: 1, gap: 11 }}>
          <Txt serif style={{ fontSize: 26, lineHeight: 34 }}>
            {b.title}
          </Txt>
          <Txt muted style={{ fontSize: 12, lineHeight: 20 }}>
            {b.author}
          </Txt>
          <Txt style={{ fontSize: 11, color: c.accent }}>
            この道の {index + 1} 冊目 · {step.duration}
          </Txt>
        </View>
      </Row>
      <View>
        <Row style={{ alignItems: "stretch", gap: 15 }}>
          <View style={{ width: 22, alignItems: "center" }}>
            <PathNode size={18} state="current" />
            <View style={{ width: 1, flex: 1, backgroundColor: "#C5D4C8" }} />
          </View>
          <View style={{ flex: 1, gap: 6, paddingBottom: 23 }}>
            <Txt muted style={{ fontSize: 11, lineHeight: 18 }}>
              Why this book
            </Txt>
            <Txt style={{ fontSize: 13, lineHeight: 23 }}>{step.why}</Txt>
          </View>
        </Row>
        <Row style={{ alignItems: "flex-start", gap: 15 }}>
          <View style={{ width: 22, alignItems: "center", paddingTop: 2 }}>
            <PathNode size={18} state={complete ? "done" : "next"} />
          </View>
          <View style={{ flex: 1, gap: 7 }}>
            <Txt style={{ fontSize: 11, lineHeight: 18, color: c.accent }}>
              この一冊の到達点
            </Txt>
            <Txt style={{ fontSize: 17, lineHeight: 27, fontWeight: "500" }}>
              {step.checkpoint}
            </Txt>
          </View>
        </Row>
      </View>
      <View
        style={{
          gap: 16,
          paddingTop: 22,
          borderTopWidth: 1,
          borderColor: c.line,
        }}
      >
        <Row style={{ justifyContent: "space-between" }}>
          <View style={{ gap: 3 }}>
            <Txt style={{ fontSize: 16, lineHeight: 24, fontWeight: "500" }}>
              {complete
                ? "Checkpoint reached"
                : reading
                  ? "On your way"
                  : "Not started"}
            </Txt>
            <Txt muted style={{ fontSize: 12 }}>
              {complete
                ? "この一冊が、あなたの力になりました。"
                : reading
                  ? "昨日より少し先へ。あなたのペースで。"
                  : "最初のページから、一歩ずつ。"}
            </Txt>
          </View>
          {reading && (
            <Txt style={{ fontSize: 24, lineHeight: 32, color: c.accent }}>
              {p.percentage}%
            </Txt>
          )}
        </Row>
        <Progress value={p?.percentage ?? 0} thin />
        <ErrorMessage
          error={!editing ? save.error || enroll.error : undefined}
        />
        {updated && !complete && (
          <Txt style={{ color: c.accent, fontSize: 12 }}>
            進捗を保存しました。今日も一歩、前へ。
          </Txt>
        )}
        {!e ? (
          <Button
            title="Roadmapを学習に追加"
            loading={enroll.isPending}
            onPress={() => {
              if (!d.profile.onboarded) {
                router.push("/onboarding");
                return;
              }
              enroll.mutate(r.id);
            }}
          />
        ) : complete ? (
          <>
            <Row style={{ gap: 8 }}>
              <Check size={18} color={c.accent} />
              <Txt style={{ fontSize: 12, color: c.accent }}>
                このCheckpointに到達しました。
              </Txt>
            </Row>
            <Button
              title={
                s.complete ? "完走したRoadmapを見る" : "次の一冊を確認する"
              }
              onPress={() => router.replace(`/roadmaps/${r.slug}`)}
            />
          </>
        ) : reading ? (
          <>
            <Button
              title="Update Progress"
              onPress={() => {
                setInput(String(p.percentage));
                save.reset();
                setEditing(true);
              }}
            />
            <Button
              title="Checkpointに到達 · Complete"
              secondary
              loading={save.isPending}
              onPress={() => update(100)}
            />
          </>
        ) : (
          <Button
            title="Start Reading"
            loading={save.isPending}
            onPress={() => update(0)}
          />
        )}
      </View>
      <Modal
        visible={editing}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => !save.isPending && setEditing(false)}
      >
        <Screen gap={24}>
          <Row style={{ justifyContent: "space-between" }}>
            <Txt style={{ fontSize: 22, lineHeight: 30, fontWeight: "500" }}>
              今日、どこまで進んだ？
            </Txt>
            <IconButton
              label="進捗編集を閉じる"
              onPress={() => !save.isPending && setEditing(false)}
            >
              <X size={21} color={c.ink} />
            </IconButton>
          </Row>
          <Txt muted style={{ fontSize: 13 }}>
            {b.title}
          </Txt>
          <Field
            label="進捗（%）"
            keyboardType="number-pad"
            value={input}
            onChangeText={setInput}
            maxLength={3}
          />
          <Row style={{ gap: 8 }}>
            {[25, 50, 75].map((n) => (
              <Chip
                key={n}
                title={`${n}%`}
                selected={input === String(n)}
                onPress={() => setInput(String(n))}
              />
            ))}
          </Row>
          <Txt muted style={{ fontSize: 12, lineHeight: 21 }}>
            大まかな進み具合で大丈夫。Checkpointに到達したら、完了にしましょう。
          </Txt>
          <ErrorMessage error={save.error} />
          <Button
            title="進捗を保存"
            loading={save.isPending}
            onPress={() => update(input.trim() === "" ? NaN : Number(input))}
          />
        </Screen>
      </Modal>
    </Screen>
  );
}
