import { View } from "react-native";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useJourney } from "@/hooks/useJourney";
import { useTadori, useAction } from "@/hooks/useTadori";
import { journeyCircle, type JourneyStage } from "@/lib/journey";
import { repository } from "@/api/repository";
import { Button, ErrorMessage, Field, Txt } from "./ui";
import { colors as c } from "@/lib/theme";
import type { Profile } from "@/types/domain";
const schema = z.object({
  name: z.string().trim().min(1, "名前を入力してください").max(80),
  username: z
    .string()
    .min(3, "3文字以上で入力してください")
    .max(24)
    .regex(/^[a-z0-9_]+$/, "半角英小文字・数字・_ が使えます"),
});
function FinishProfile({ profile }: { profile: Profile }) {
  const tour = useJourney();
  const save = useAction(repository.saveProfile);
  const [error, setError] = useState<unknown>();
  const needsName = tour.state.needsName ?? !profile.name;
  const needsUsername = tour.state.needsUsername ?? !profile.username;
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: needsName ? "" : profile.name,
      username: needsUsername ? "" : profile.username,
    },
  });
  return (
    <View style={{ gap: 16 }}>
      {(needsName || needsUsername) && (
        <Txt muted style={{ fontSize: 12 }}>
          {needsName
            ? "最後に、学びの道にあなたの名前を。"
            : "共有に使うユーザー名を決めましょう。"}
        </Txt>
      )}
      {needsName && (
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Field
              label="Name"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.name?.message}
              placeholder="あなたの名前"
            />
          )}
        />
      )}
      {needsUsername && (
        <Controller
          control={control}
          name="username"
          render={({ field }) => (
            <Field
              label="Username"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.username?.message}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="例：kurashina"
            />
          )}
        />
      )}
      <ErrorMessage error={error || tour.error} />
      <Txt serif style={{ fontSize: 23 }}>
        You're ready.
      </Txt>
      <Button
        title="Continue to Today"
        loading={save.isPending || tour.busy}
        onPress={handleSubmit(async (values) => {
          try {
            if (needsName || needsUsername)
              await save.mutateAsync({ ...profile, ...values });
            await tour.set({ stage: "done", roadmapId: tour.state.roadmapId });
            router.replace("/");
          } catch (err) {
            setError(err);
          }
        })}
      />
    </View>
  );
}
export function JourneyCoach({ screen }: { screen: JourneyStage }) {
  const tour = useJourney();
  const q = useTadori();
  const [error, setError] = useState<unknown>();
  if (!tour.ready || tour.state.stage !== screen || !q.data) return null;
  const d = q.data;
  const circle = journeyCircle(d, tour.state.roadmapId);
  const move = async (
    stage: JourneyStage,
    path: "/me" | "/circles" | `/circles/${string}`,
  ) => {
    try {
      await tour.set({ ...tour.state, stage });
      router.push(path);
    } catch (err) {
      setError(err);
    }
  };
  const titles = {
    explore: "Find your first path.",
    today: "Today is your starting point.",
    circles: "Learn together.",
    me: "This becomes your learning profile.",
  };
  const descriptions = {
    explore:
      "まずは一本、歩く道を選びましょう。興味のある分野と、短い道を優先して並べました。",
    today: "今読む本と、次の到達点がいつでもここに表示されます。",
    circles:
      "同じ本やRoadmapを進める人と、小さなCircleをつくれます。参加は任意です。",
    me: "何を学び、どこまで辿ったかが、ここに積み上がります。",
  };
  if (!(screen in titles)) return null;
  const step = screen as keyof typeof titles;
  return (
    <View
      style={{
        padding: 18,
        gap: 12,
        backgroundColor: c.wash,
        borderRadius: 12,
      }}
    >
      {screen === "today" && (
        <Txt style={{ color: c.accent, fontSize: 12 }}>
          Your path has begun.
        </Txt>
      )}
      <Txt serif style={{ fontSize: 22, lineHeight: 29 }}>
        {titles[step]}
      </Txt>
      <Txt muted style={{ fontSize: 12, lineHeight: 21 }}>
        {descriptions[step]}
      </Txt>
      {screen === "today" && (
        <>
          {circle ? (
            <>
              <Txt style={{ fontSize: 12 }}>
                {circle.members.length}人のCircleがあります · {circle.name}
              </Txt>
              <Button
                title="See Circle"
                secondary
                loading={tour.busy}
                onPress={() => move("circles", `/circles/${circle.id}`)}
              />
            </>
          ) : (
            <Txt muted style={{ fontSize: 12 }}>
              この道のCircleはまだありません。あとから仲間を集めることもできます。
            </Txt>
          )}
          <Button
            title={circle ? "Skip to Me" : "See my learning profile"}
            secondary
            loading={tour.busy}
            onPress={() => move("me", "/me")}
          />
        </>
      )}
      {screen === "circles" && (
        <Button
          title="Continue to Me"
          secondary
          loading={tour.busy}
          onPress={() => move("me", "/me")}
        />
      )}
      {screen === "me" && (
        <>
          <Txt style={{ color: c.accent, fontSize: 13 }}>
            {
              d.enrollments.filter((e) => {
                const r = d.roadmaps.find((r) => r.id === e.roadmapId);
                return r?.steps.some(
                  (s) => e.progress[s.id]?.status !== "COMPLETED",
                );
              }).length
            }{" "}
            roadmaps in progress
          </Txt>
          <FinishProfile profile={d.profile} />
        </>
      )}
      <ErrorMessage error={error || tour.error} />
    </View>
  );
}
