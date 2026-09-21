import { useState } from "react";
import { Platform, Switch, View } from "react-native";
import { Bell } from "lucide-react-native";
import { useAction, useTadori } from "@/hooks/useTadori";
import { repository } from "@/api/repository";
import { NotificationSettings as Settings } from "@/types/domain";
import {
  Button,
  Card,
  Chip,
  DataError,
  ErrorMessage,
  Field,
  Label,
  Loading,
  PageTitle,
  Row,
  Screen,
  Txt,
} from "@/components/ui";
import { colors as c } from "@/lib/theme";
import { registerPush, scheduleReminder } from "@/lib/notifications";
import { reminderSchema } from "./forms";
import { summary } from "@/lib/progress";
export default function NotificationSettings() {
  const q = useTadori();
  const [draft, setDraft] = useState<Settings | null>(null);
  const [error, setError] = useState<unknown>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const save = useAction(repository.settings);
  if (q.isPending) return <Loading />;
  if (!q.data) return <DataError retry={() => q.refetch()} />;
  const d = q.data;
  const v = draft ?? d.notifications;
  const change = (patch: Partial<Settings>) => {
    setDraft({ ...v, ...patch });
    setMessage("");
  };
  const submit = async () => {
    setError(undefined);
    setMessage("");
    const parsed = reminderSchema.safeParse(v);
    if (!parsed.success) {
      setError(new Error(parsed.error.issues[0].message));
      return;
    }
    setBusy(true);
    try {
      const e = d.enrollments.find(
        (e) => !v.roadmapId || e.roadmapId === v.roadmapId,
      );
      const r = d.roadmaps.find((r) => r.id === e?.roadmapId);
      const step = r ? summary(r, e).current : undefined;
      const b = d.books.find((b) => b.id === step?.bookId);
      await scheduleReminder(v, b?.title, r?.slug);
      await save.mutateAsync(v);
      setMessage("通知設定を保存しました。");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen back title="NOTIFICATIONS">
      <PageTitle
        eyebrow="A GENTLE NUDGE"
        title="学びを、習慣に。"
        description="必要なときに、必要な通知だけ。"
      />
      {(
        [
          {
            key: "study",
            title: "Study Reminder",
            description: "あなたのペースで、学びの続きを。",
          },
          {
            key: "circle",
            title: "Circle Reminder",
            description: "Circleの開始・ミーティングのお知らせ。",
          },
          {
            key: "progress",
            title: "Progress Notification",
            description: "Roadmap完走・次の一冊のお知らせ。",
          },
          {
            key: "invite",
            title: "Invite Notification",
            description: "Circleへの招待・新しい仲間の参加。",
          },
        ] as const
      ).map((item) => (
        <View
          key={item.key}
          style={{
            gap: 18,
            paddingBottom: 22,
            borderBottomWidth: 1,
            borderColor: c.line,
          }}
        >
          <Row style={{ justifyContent: "space-between" }}>
            <View style={{ flex: 1, gap: 5 }}>
              <Txt style={{ fontSize: 15, fontWeight: "500" }}>
                {item.title}
              </Txt>
              <Txt muted style={{ fontSize: 11, lineHeight: 19 }}>
                {item.description}
              </Txt>
            </View>
            <Switch
              accessibilityLabel={item.title}
              value={v[item.key]}
              trackColor={{ false: c.line, true: c.accent }}
              onValueChange={(value) => change({ [item.key]: value })}
            />
          </Row>
          {item.key === "study" && v.study && (
            <>
              <Field
                label="Reminder time"
                value={v.time}
                placeholder="20:00"
                keyboardType="numbers-and-punctuation"
                onChangeText={(time) => change({ time })}
              />
              <Row style={{ flexWrap: "wrap", gap: 6 }}>
                {["日", "月", "火", "水", "木", "金", "土"].map((day, i) => (
                  <Chip
                    key={day}
                    title={day}
                    selected={v.weekdays.includes(i + 1)}
                    onPress={() =>
                      change({
                        weekdays: v.weekdays.includes(i + 1)
                          ? v.weekdays.filter((d) => d !== i + 1)
                          : [...v.weekdays, i + 1],
                      })
                    }
                  />
                ))}
              </Row>
              <Label>ROADMAP</Label>
              <Chip
                title="メインのRoadmap"
                selected={!v.roadmapId}
                onPress={() => change({ roadmapId: undefined })}
              />
              {d.enrollments.map((e) => {
                const r = d.roadmaps.find((r) => r.id === e.roadmapId);
                return r ? (
                  <Chip
                    key={r.id}
                    title={r.title}
                    selected={v.roadmapId === r.id}
                    onPress={() => change({ roadmapId: r.id })}
                  />
                ) : null;
              })}
            </>
          )}
        </View>
      ))}
      <ErrorMessage error={error || save.error} />
      {!!message && (
        <Txt style={{ color: c.accent, fontSize: 12 }}>{message}</Txt>
      )}
      <Button title="通知設定を保存" loading={busy} onPress={submit} />
      {Platform.OS !== "web" && (
        <Button
          secondary
          title="この端末でPush通知を有効化"
          loading={busy}
          onPress={async () => {
            setBusy(true);
            setError(undefined);
            try {
              const ok = await registerPush();
              setMessage(
                ok
                  ? "この端末を登録しました。"
                  : "Push通知は配布用ビルドとサーバー接続の設定後に利用できます。",
              );
            } catch (err) {
              setError(err);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
      <Txt muted style={{ fontSize: 10, lineHeight: 19, textAlign: "center" }}>
        通知はいつでも変更できます。
        {Platform.OS === "web"
          ? " 学習リマインダーはiOS / Androidアプリで利用できます。"
          : ""}
      </Txt>
    </Screen>
  );
}
