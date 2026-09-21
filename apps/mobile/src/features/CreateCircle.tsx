import { useState } from "react";
import { BookRegistration } from "@/components/BookRegistration";
import { View } from "react-native";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Button,
  Chip,
  DataError,
  ErrorMessage,
  Field,
  Loading,
  PageTitle,
  Row,
  Screen,
  Txt,
} from "@/components/ui";
import { useAction, useTadori } from "@/hooks/useTadori";
import { repository } from "@/api/repository";
import { circleSchema } from "./forms";
export default function CreateCircle() {
  const [registration, setRegistration] = useState(false);
  const q = useTadori();
  const save = useAction(repository.createCircle);
  const {
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof circleSchema>>({
    resolver: zodResolver(circleSchema),
    defaultValues: {
      name: "",
      targetType: "Roadmap",
      targetId: "backend",
      visibility: "PUBLIC",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      meeting: "",
      maxMembers: 8,
    },
  });
  const v = watch();
  if (q.isPending) return <Loading />;
  if (!q.data) return <DataError retry={() => q.refetch()} />;
  const d = q.data;
  return (
    <Screen back title="CREATE A CIRCLE">
      <PageTitle
        eyebrow="A SMALL CIRCLE. A SHARED PATH."
        title="一緒に、辿ろう。"
        description="学ぶ対象と、ゆるやかな予定を決めましょう。"
      />
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <Field
            label="Name"
            placeholder="Circleの名前"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.name?.message}
          />
        )}
      />
      <View style={{ gap: 12 }}>
        <Txt style={{ fontSize: 12, fontWeight: "600" }}>学ぶ対象</Txt>
        <Row>
          {(["Roadmap", "Book"] as const).map((type) => (
            <Chip
              key={type}
              title={type}
              selected={v.targetType === type}
              onPress={() => {
                setValue("targetType", type);
                setValue(
                  "targetId",
                  type === "Roadmap" ? d.roadmaps[0].id : d.books[0].id,
                );
              }}
            />
          ))}
        </Row>
        <View style={{ gap: 7 }}>
          {v.targetType === "Book" && (
            <Button
              secondary
              title="新しい本を登録する"
              onPress={() => setRegistration(true)}
            />
          )}
          {(v.targetType === "Roadmap" ? d.roadmaps : d.books).map((item) => (
            <Chip
              key={item.id}
              title={item.title}
              selected={v.targetId === item.id}
              onPress={() => setValue("targetId", item.id)}
            />
          ))}
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <Txt style={{ fontSize: 12, fontWeight: "600" }}>Visibility</Txt>
        <Row>
          {(["PUBLIC", "INVITE_ONLY"] as const).map((value) => (
            <Chip
              key={value}
              title={value === "PUBLIC" ? "公開" : "招待制"}
              selected={v.visibility === value}
              onPress={() => setValue("visibility", value)}
            />
          ))}
        </Row>
      </View>
      {(["startDate", "endDate", "meeting"] as const).map((name) => (
        <Controller
          key={name}
          control={control}
          name={name}
          render={({ field }) => (
            <Field
              label={
                {
                  startDate: "Start Date",
                  endDate: "Target End Date",
                  meeting: "Next Meeting（任意）",
                }[name]
              }
              placeholder={
                name === "meeting" ? "2026-10-01T20:00" : "YYYY-MM-DD"
              }
              value={field.value}
              onChangeText={field.onChange}
              autoCapitalize="none"
              error={errors[name]?.message}
            />
          )}
        />
      ))}
      <Controller
        control={control}
        name="maxMembers"
        render={({ field }) => (
          <Field
            label="Max Members（2–30人）"
            keyboardType="number-pad"
            value={String(field.value || "")}
            onChangeText={(t) => field.onChange(Number(t))}
            error={errors.maxMembers?.message}
          />
        )}
      />
      <ErrorMessage error={save.error} />
      <Button
        title="Circleをつくる"
        loading={save.isPending}
        onPress={handleSubmit(async (values) => {
          if (!d.profile.onboarded) {
            router.push("/onboarding");
            return;
          }
          try {
            const id = await save.mutateAsync(values);
            router.replace(`/circles/${id}`);
          } catch {}
        })}
      />
      <BookRegistration
        visible={registration}
        onClose={() => setRegistration(false)}
        onRegistered={(id) => {
          setValue("targetId", id);
          setRegistration(false);
        }}
      />
    </Screen>
  );
}
