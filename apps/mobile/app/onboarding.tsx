import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Route } from "lucide-react-native";
import {
  Button,
  Chip,
  DataError,
  ErrorMessage,
  Loading,
  Row,
  Screen,
  Txt,
} from "@/components/ui";
import { categories, type Category } from "@/types/domain";
import { useAction, useTadori } from "@/hooks/useTadori";
import { useJourney } from "@/hooks/useJourney";
import { journeyRoute } from "@/lib/journey";
import { repository } from "@/api/repository";
import { colors as c } from "@/lib/theme";
export default function Onboarding() {
  const q = useTadori();
  const tour = useJourney();
  const save = useAction(repository.saveProfile);
  const [selected, setSelected] = useState<Category[]>([]);
  const [error, setError] = useState<unknown>();
  if (q.isPending) return <Loading />;
  if (!q.data) return <DataError retry={() => q.refetch()} />;
  if (!tour.ready && !tour.error) return <Loading />;
  const p = q.data.profile;
  const welcome = tour.state.stage === "welcome";
  return (
    <Screen gap={24}>
      <Row style={{ gap: 8 }}>
        <Route size={22} color={c.accent} />
        <Txt serif style={{ fontSize: 29 }}>
          tadori
        </Txt>
      </Row>
      {welcome ? (
        <View style={{ minHeight: 440, justifyContent: "center", gap: 28 }}>
          <View style={{ alignItems: "center", paddingVertical: 20 }}>
            <Route size={64} strokeWidth={1.2} color={c.accent} />
          </View>
          <Txt
            serif
            style={{ fontSize: 36, lineHeight: 46, textAlign: "center" }}
          >
            Learn by following{`\n`}a path.
          </Txt>
          <Txt
            muted
            style={{ fontSize: 14, lineHeight: 25, textAlign: "center" }}
          >
            何を、どの順番で、どこまで学ぶか。{`\n`}
            本から、あなたの学びの道をつくる。
          </Txt>
          <Button
            title="Start your path"
            loading={tour.busy}
            onPress={async () => {
              try {
                await tour.set({ stage: "interests" });
              } catch {}
            }}
          />
        </View>
      ) : tour.state.stage === "interests" ? (
        <>
          <View style={{ paddingTop: 32, gap: 12 }}>
            <Txt serif style={{ fontSize: 32, lineHeight: 42 }}>
              What do you want{`\n`}to learn?
            </Txt>
            <Txt muted>
              どんな道を歩きたい？ 興味のある分野を2〜3個選んでください。
            </Txt>
          </View>
          <Row style={{ flexWrap: "wrap", gap: 12, paddingVertical: 20 }}>
            {categories.map((cat) => (
              <Chip
                key={cat}
                title={cat}
                selected={selected.includes(cat)}
                onPress={() => {
                  setSelected((current) =>
                    current.includes(cat)
                      ? current.filter((v) => v !== cat)
                      : current.length < 3
                        ? [...current, cat]
                        : current,
                  );
                }}
              />
            ))}
          </Row>
          <Txt muted style={{ fontSize: 12 }}>
            {selected.length} / 3 選択中 · あとから変更できます
          </Txt>
          <Button
            title="Find my first path"
            disabled={selected.length < 2}
            loading={save.isPending || tour.busy}
            onPress={async () => {
              try {
                // Save identity only at the final profile step. Existing authenticated names are preserved.
                await save.mutateAsync({
                  ...p,
                  name: p.name || "Learner",
                  username: p.username || `learner_${Date.now().toString(36)}`,
                  interests: selected,
                  onboarded: true,
                });
                await tour.set({
                  stage: "explore",
                  needsName: !p.name,
                  needsUsername: !p.username || !p.onboarded,
                });
                router.replace("/explore");
              } catch (err) {
                setError(err);
              }
            }}
          />
          <Button
            title="Welcomeに戻る"
            secondary
            icon={false}
            onPress={async () => {
              try {
                await tour.set({ stage: "welcome" });
              } catch {}
            }}
          />
        </>
      ) : (
        <>
          <Txt serif style={{ fontSize: 28 }}>
            Your path awaits.
          </Txt>
          <Button
            title="続きから進む"
            onPress={() => router.replace(journeyRoute(tour.state.stage))}
          />
        </>
      )}
      <ErrorMessage error={error || tour.error} />
    </Screen>
  );
}
