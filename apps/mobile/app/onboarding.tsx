import { View } from "react-native";
import { router } from "expo-router";
import { Route } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Button,
  Chip,
  Cover,
  ErrorMessage,
  Field,
  Label,
  Row,
  Screen,
  Txt,
} from "@/components/ui";
import { categories } from "@/types/domain";
import { useAction, useTadori } from "@/hooks/useTadori";
import { repository } from "@/api/repository";
import { books } from "@/api/seed";
import { colors as c } from "@/lib/theme";
const schema = z.object({
  name: z.string().trim().min(1, "名前を入力してください").max(40),
  username: z
    .string()
    .min(3, "3文字以上で入力してください")
    .max(24)
    .regex(/^[a-z0-9_]+$/, "半角英小文字・数字・_ が使えます"),
  interests: z
    .array(z.enum(categories))
    .min(1, "興味のある分野を選んでください"),
});
export default function Onboarding() {
  const { data } = useTadori();
  const save = useAction(repository.saveProfile);
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { name: "", username: "", interests: [] },
  });
  const selected = watch("interests");
  return (
    <Screen>
      <Row style={{ justifyContent: "space-between" }}>
        <Row style={{ gap: 8 }}>
          <Route size={22} color={c.accent} />
          <Txt serif style={{ fontSize: 29, letterSpacing: -1 }}>
            tadori
          </Txt>
        </Row>
        <Label>YOUR FIRST STEP</Label>
      </Row>
      <View style={{ alignItems: "center", paddingVertical: 16, gap: 25 }}>
        <Row style={{ gap: 24, alignItems: "flex-end" }}>
          {[books[0], books[1], books[4]].map((b, i) => (
            <View
              key={b.id}
              style={{
                transform: [{ rotate: `${(i - 1) * 9}deg` }],
                marginBottom: i === 1 ? 14 : 0,
              }}
            >
              <Cover book={b} width={70} />
            </View>
          ))}
        </Row>
        <View style={{ gap: 12 }}>
          <Txt
            serif
            style={{ fontSize: 29, lineHeight: 42, textAlign: "center" }}
          >
            誰かが作った学びの道を、{`\n`}辿る。
          </Txt>
          <Txt muted style={{ textAlign: "center", fontSize: 12 }}>
            読む順番が変わると、学びがつながる。
          </Txt>
        </View>
      </View>
      <View style={{ gap: 18 }}>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Field
              label="Name"
              placeholder="あなたの名前"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.name?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="username"
          render={({ field }) => (
            <Field
              label="Username"
              placeholder="例：kurashina（半角英数字）"
              keyboardType="ascii-capable"
              autoCapitalize="none"
              autoCorrect={false}
              value={field.value}
              onChangeText={field.onChange}
              error={errors.username?.message}
            />
          )}
        />
        <Txt style={{ fontWeight: "600", fontSize: 12 }}>
          どんな道を、歩いてみたいですか？
        </Txt>
        <Row style={{ flexWrap: "wrap", gap: 8 }}>
          {categories.map((cat) => (
            <Chip
              key={cat}
              title={cat}
              selected={selected.includes(cat)}
              onPress={() =>
                setValue(
                  "interests",
                  selected.includes(cat)
                    ? selected.filter((c) => c !== cat)
                    : [...selected, cat],
                  { shouldValidate: true },
                )
              }
            />
          ))}
        </Row>
        {errors.interests && (
          <ErrorMessage error={new Error(errors.interests.message)} />
        )}
        <ErrorMessage error={save.error} />
        {errors.username && (
          <ErrorMessage
            error={new Error(`Username：${errors.username.message}`)}
          />
        )}
        <Button
          title="学びの道を見つける"
          loading={save.isPending}
          onPress={handleSubmit(async (values) => {
            try {
              await save.mutateAsync({
                ...values,
                bio: data?.profile.bio ?? "",
                onboarded: true,
              });
              router.replace("/explore");
            } catch {}
          })}
        />
        <Txt muted style={{ textAlign: "center", fontSize: 10 }}>
          自分のペースで、一冊ずつ。
        </Txt>
      </View>
    </Screen>
  );
}
