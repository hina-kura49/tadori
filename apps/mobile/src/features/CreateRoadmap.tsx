import { BookRegistration } from "@/components/BookRegistration";
import { useState } from "react";
import { Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DraggableFlatList, {
  NestableDraggableFlatList,
} from "react-native-draggable-flatlist";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Plus,
  Trash2,
  X,
} from "lucide-react-native";
import { useAction, useTadori } from "@/hooks/useTadori";
import { repository } from "@/api/repository";
import { categories, Step } from "@/types/domain";
import {
  Button,
  Card,
  Chip,
  Cover,
  DataError,
  ErrorMessage,
  Field,
  IconButton,
  Label,
  Loading,
  PageTitle,
  Row,
  Screen,
  Txt,
} from "@/components/ui";
import { colors as c } from "@/lib/theme";
import { roadmapSchema, RoadmapForm } from "./forms";
const SortableSteps =
  Platform.OS === "web" ? DraggableFlatList : NestableDraggableFlatList;
export default function CreateRoadmap() {
  const q = useTadori();
  const save = useAction(repository.createRoadmap);
  const [picker, setPicker] = useState(false);
  const [registration, setRegistration] = useState(false);
  const [search, setSearch] = useState("");
  const {
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<RoadmapForm>({
    resolver: zodResolver(roadmapSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "Engineering",
      difficulty: "Beginner",
      duration: "",
      visibility: "PUBLIC",
      steps: [],
    },
  });
  const values = watch();
  if (q.isPending) return <Loading />;
  if (!q.data) return <DataError retry={() => q.refetch()} />;
  const d = q.data;
  const change = (i: number, field: keyof Step, value: string) =>
    setValue(
      "steps",
      values.steps.map((step, index) =>
        index === i ? { ...step, [field]: value } : step,
      ),
      { shouldValidate: false },
    );
  const move = (i: number, delta: number) => {
    const steps = [...values.steps];
    if (i + delta < 0 || i + delta >= steps.length) return;
    [steps[i], steps[i + delta]] = [steps[i + delta], steps[i]];
    setValue("steps", steps);
  };
  const submit = handleSubmit(async (input) => {
    if (!d.profile.onboarded) {
      router.push("/onboarding");
      return;
    }
    try {
      const slug = await save.mutateAsync(input);
      router.replace(`/roadmaps/${slug}`);
    } catch {}
  });
  return (
    <Screen back nested title="CREATE A ROADMAP">
      <PageTitle
        eyebrow="A PATH WORTH SHARING"
        title="つながる学びを、つくる。"
        description="読み終えた先に、何ができるようになるか。"
      />
      <View style={{ gap: 20 }}>
        {(["title", "description", "duration"] as const).map((name) => (
          <Controller
            key={name}
            control={control}
            name={name}
            render={({ field }) => (
              <Field
                label={
                  name === "title"
                    ? "Title"
                    : name === "description"
                      ? "Description"
                      : "Estimated Duration"
                }
                placeholder={
                  name === "title"
                    ? "例：Backend Engineering Foundations"
                    : name === "description"
                      ? "この道の先に、何ができるようになりますか？"
                      : "例：2–3 months"
                }
                multiline={name === "description"}
                value={field.value}
                onChangeText={field.onChange}
                error={errors[name]?.message}
              />
            )}
          />
        ))}
        <Txt style={{ fontSize: 12, fontWeight: "600" }}>Category</Txt>
        <Row style={{ flexWrap: "wrap", gap: 7 }}>
          {categories.map((cat) => (
            <Chip
              key={cat}
              title={cat}
              selected={values.category === cat}
              onPress={() => setValue("category", cat)}
            />
          ))}
        </Row>
        <Txt style={{ fontSize: 12, fontWeight: "600" }}>Difficulty</Txt>
        <Row style={{ flexWrap: "wrap", gap: 7 }}>
          {(["Beginner", "Intermediate", "Advanced"] as const).map((v) => (
            <Chip
              key={v}
              title={v}
              selected={values.difficulty === v}
              onPress={() => setValue("difficulty", v)}
            />
          ))}
        </Row>
        <Txt style={{ fontSize: 12, fontWeight: "600" }}>Visibility</Txt>
        <Row style={{ gap: 7 }}>
          {(["PUBLIC", "UNLISTED", "PRIVATE"] as const).map((v) => (
            <Chip
              key={v}
              title={
                { PUBLIC: "公開", UNLISTED: "限定公開", PRIVATE: "非公開" }[v]
              }
              selected={values.visibility === v}
              onPress={() => setValue("visibility", v)}
            />
          ))}
        </Row>
        <Txt muted style={{ fontSize: 11 }}>
          {
            {
              PUBLIC: "Exploreから誰でも見つけられます。",
              UNLISTED: "リンクを知っている人だけが閲覧できます。",
              PRIVATE: "あなたの学びのためのRoadmapです。",
            }[values.visibility]
          }
        </Txt>
      </View>
      <View style={{ gap: 12 }}>
        <Label>BUILD YOUR LEARNING PATH</Label>
        <Txt muted style={{ fontSize: 11 }}>
          ハンドルを長押しして並べ替え。矢印でも変更できます。
        </Txt>
        <SortableSteps
          data={values.steps}
          keyExtractor={(s) => s.id}
          scrollEnabled={false}
          onDragEnd={({ data }) => setValue("steps", data)}
          renderItem={({ item, getIndex, drag, isActive }) => {
            const i = getIndex() ?? 0;
            const b = d.books.find((b) => b.id === item.bookId)!;
            return (
              <Card
                style={{
                  marginBottom: 14,
                  opacity: isActive ? 0.75 : 1,
                  padding: 16,
                }}
              >
                <Row style={{ gap: 8 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${b.title}を長押しで並べ替え`}
                    onLongPress={drag}
                    delayLongPress={250}
                    style={{ padding: 8 }}
                  >
                    <GripVertical size={20} color={c.muted} />
                  </Pressable>
                  <Cover book={b} width={35} />
                  <View style={{ flex: 1 }}>
                    <Label>STEP {i + 1}</Label>
                    <Txt style={{ fontSize: 12, lineHeight: 18 }}>
                      {b.title}
                    </Txt>
                  </View>
                  <IconButton
                    label={`${b.title}を削除`}
                    onPress={() =>
                      setValue(
                        "steps",
                        values.steps.filter((s) => s.id !== item.id),
                      )
                    }
                  >
                    <Trash2 size={17} color={c.muted} />
                  </IconButton>
                </Row>
                <Field
                  label="Why this book?"
                  placeholder="この本を選んだ理由"
                  value={item.why}
                  onChangeText={(v) => change(i, "why", v)}
                  error={errors.steps?.[i]?.why?.message}
                />
                <Field
                  label="Checkpoint *"
                  placeholder="例：HTTPリクエストの基本構造を説明できる"
                  multiline
                  value={item.checkpoint}
                  onChangeText={(v) => change(i, "checkpoint", v)}
                  error={errors.steps?.[i]?.checkpoint?.message}
                />
                <Field
                  label="Step Duration"
                  placeholder="例：2 weeks"
                  value={item.duration}
                  onChangeText={(v) => change(i, "duration", v)}
                  error={errors.steps?.[i]?.duration?.message}
                />
                <Row style={{ justifyContent: "flex-end" }}>
                  <IconButton
                    label={`${b.title}を上へ`}
                    onPress={() => move(i, -1)}
                  >
                    <ArrowUp size={17} color={i ? c.accent : c.line} />
                  </IconButton>
                  <IconButton
                    label={`${b.title}を下へ`}
                    onPress={() => move(i, 1)}
                  >
                    <ArrowDown
                      size={17}
                      color={i < values.steps.length - 1 ? c.accent : c.line}
                    />
                  </IconButton>
                </Row>
              </Card>
            );
          }}
        />
        <ErrorMessage
          error={
            errors.steps?.message ? new Error(errors.steps.message) : undefined
          }
        />
        <Button
          secondary
          title="本を追加する"
          onPress={() => setPicker(true)}
        />
      </View>
      <ErrorMessage error={save.error} />
      {Object.keys(errors).length > 0 && (
        <Txt style={{ color: c.error, fontSize: 12 }}>
          入力内容を確認してください。各StepのCheckpointは必須です。
        </Txt>
      )}
      <Button
        title="Roadmapを保存する"
        loading={save.isPending}
        onPress={submit}
      />
      <Modal
        visible={picker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPicker(false)}
      >
        <Screen>
          <Row style={{ justifyContent: "space-between" }}>
            <PageTitle title="本を選ぶ" />
            <IconButton label="閉じる" onPress={() => setPicker(false)}>
              <X size={22} color={c.ink} />
            </IconButton>
          </Row>
          <Button
            secondary
            title="新しい本を登録する"
            onPress={() => {
              setPicker(false);
              setTimeout(() => setRegistration(true), 350);
            }}
          />
          <Field
            label="Search books"
            placeholder="タイトル・著者で検索"
            value={search}
            onChangeText={setSearch}
          />
          {d.books
            .filter((b) =>
              `${b.title} ${b.author}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((b) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${b.title}を追加`}
                key={b.id}
                onPress={() => {
                  setValue("steps", [
                    ...values.steps,
                    {
                      id: `step-${Date.now()}`,
                      bookId: b.id,
                      why: "",
                      checkpoint: "",
                      duration: "",
                    },
                  ]);
                  setPicker(false);
                  setSearch("");
                }}
              >
                <Row style={{ paddingVertical: 10 }}>
                  <Cover book={b} width={42} />
                  <View style={{ flex: 1 }}>
                    <Txt style={{ fontSize: 14 }}>{b.title}</Txt>
                    <Txt muted style={{ fontSize: 11 }}>
                      {b.author}
                    </Txt>
                  </View>
                  <Plus size={19} color={c.accent} />
                </Row>
              </Pressable>
            ))}
          {!d.books.some((b) =>
            `${b.title} ${b.author}`
              .toLowerCase()
              .includes(search.toLowerCase()),
          ) && <Txt muted>一致する本がありません。</Txt>}
        </Screen>
      </Modal>
      <BookRegistration
        visible={registration}
        onClose={() => setRegistration(false)}
        onRegistered={(id) => {
          setValue("steps", [
            ...values.steps,
            {
              id: `step-${Date.now()}`,
              bookId: id,
              why: "",
              checkpoint: "",
              duration: "",
            },
          ]);
          setRegistration(false);
        }}
      />
    </Screen>
  );
}
