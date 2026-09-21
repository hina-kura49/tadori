import { useRef, useState } from "react";
import { Platform, Share, View } from "react-native";
import { captureRef, releaseCapture } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { Route } from "lucide-react-native";
import { useTadori } from "@/hooks/useTadori";
import {
  Avatar,
  Button,
  DataError,
  ErrorMessage,
  Loading,
  Row,
  Screen,
  Txt,
} from "@/components/ui";
import { LearningTerrain } from "@/components/LearningTerrain";
import { colors as c } from "@/lib/theme";
import { summary } from "@/lib/progress";
export default function ShareProfile() {
  const q = useTadori();
  const card = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<unknown>();
  if (q.isPending) return <Loading />;
  if (!q.data) return <DataError retry={() => q.refetch()} />;
  const d = q.data;
  const enrolled = d.enrollments.flatMap((e) => {
    const r = d.roadmaps.find((r) => r.id === e.roadmapId);
    return r ? [{ r, e }] : [];
  });
  const completed = enrolled.filter(
    ({ r, e }) => summary(r, e).complete,
  ).length;
  const checkpoints = enrolled.reduce(
    (n, { r, e }) => n + summary(r, e).done,
    0,
  );
  const share = async () => {
    setError(undefined);
    setBusy(true);
    let uri: string | undefined;
    try {
      if (Platform.OS === "web") {
        await Share.share({
          message: `${d.profile.name}の学びの道 — Tadori\n${d.profile.interests.join(" / ")}\n${checkpoints} checkpoints · ${completed} roadmaps completed\n誰かが作った学びの道を、辿る。`,
        });
        return;
      }
      if (!(await Sharing.isAvailableAsync()))
        throw new Error("この端末では共有機能を利用できません。");
      uri = await captureRef(card, {
        format: "png",
        quality: 1,
        result: "tmpfile",
        width: 1080,
      });
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        UTI: "public.png",
        dialogTitle: "学びの道を共有",
      });
    } catch (err) {
      if (!(err instanceof Error && err.name === "AbortError")) setError(err);
    } finally {
      if (uri) releaseCapture(uri);
      setBusy(false);
    }
  };
  return (
    <Screen back title="Share your path" gap={20}>
      <View style={{ gap: 6 }}>
        <Txt style={{ fontSize: 22, lineHeight: 30, fontWeight: "500" }}>
          学びの道を、持ち出そう。
        </Txt>
        <Txt muted style={{ fontSize: 12, lineHeight: 21 }}>
          このカードを画像として共有できます。
          {Platform.OS === "web" ? " Webではテキストで共有します。" : ""}
        </Txt>
      </View>
      <View
        ref={card}
        collapsable={false}
        onLayout={() => setReady(true)}
        style={{
          backgroundColor: c.paper,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: 14,
          padding: 22,
          gap: 25,
        }}
      >
        <Row style={{ justifyContent: "space-between" }}>
          <Row style={{ gap: 7 }}>
            <Route size={21} color={c.accent} />
            <Txt serif style={{ fontSize: 27, lineHeight: 35 }}>
              tadori
            </Txt>
          </Row>
          <Txt muted style={{ fontSize: 10 }}>
            MY LEARNING PATH
          </Txt>
        </Row>
        <Row style={{ gap: 12 }}>
          <Avatar name={d.profile.name} uri={d.profile.avatarUri} size={48} />
          <View style={{ gap: 3 }}>
            <Txt style={{ fontSize: 21, lineHeight: 28, fontWeight: "500" }}>
              {d.profile.name}
            </Txt>
            <Txt muted style={{ fontSize: 11 }}>
              @{d.profile.username}
            </Txt>
          </View>
        </Row>
        <LearningTerrain data={d} maxAreas={3} />
        <Row
          style={{
            borderTopWidth: 1,
            borderColor: c.line,
            paddingTop: 15,
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <Txt style={{ fontSize: 12, color: c.accent }}>
            {checkpoints} checkpoints · {completed} paths completed
          </Txt>
        </Row>
        <Txt muted style={{ fontSize: 10, textAlign: "center" }}>
          誰かが作った学びの道を、辿る。
        </Txt>
      </View>
      <ErrorMessage error={error} />
      <Button
        title={Platform.OS === "web" ? "テキストで共有" : "画像を共有する"}
        disabled={!ready}
        loading={busy}
        onPress={share}
      />
      <Txt muted style={{ fontSize: 11, lineHeight: 20 }}>
        共有先と送信内容は、次の画面で選べます。
      </Txt>
    </Screen>
  );
}
