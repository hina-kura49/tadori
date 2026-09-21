import { useState } from "react";
import { Image, Modal, View } from "react-native";
import { X, ImagePlus } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Button,
  ErrorMessage,
  Field,
  IconButton,
  PageTitle,
  Row,
  Screen,
  Txt,
} from "./ui";
import { useAction } from "@/hooks/useTadori";
import { repository } from "@/api/repository";
import { persistBookImage, selectBookImage } from "@/lib/bookImages";
import { colors as c } from "@/lib/theme";
const schema = z.object({
  title: z.string().trim().min(1, "タイトルを入力してください").max(150),
  author: z.string().trim().min(1, "著者を入力してください").max(100),
});
export function BookRegistration({
  visible,
  onClose,
  onRegistered,
}: {
  visible: boolean;
  onClose: () => void;
  onRegistered: (id: string) => void;
}) {
  const [cover, setCover] = useState<string>();
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const save = useAction(repository.createBook);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", author: "" },
  });
  return (
    <Modal
      visible={visible}
      presentationStyle="pageSheet"
      animationType="slide"
      onRequestClose={onClose}
    >
      <Screen>
        <Row style={{ justifyContent: "space-between" }}>
          <PageTitle title="本を登録する" />
          <IconButton label="登録を閉じる" onPress={onClose}>
            <X size={22} color={c.ink} />
          </IconButton>
        </Row>
        <Txt muted style={{ fontSize: 13 }}>
          あなたの学びに加えたい一冊を。
        </Txt>
        <View style={{ alignItems: "center", gap: 16 }}>
          {cover ? (
            <Image
              accessibilityLabel="選択した表紙"
              source={{ uri: cover }}
              style={{ width: 100, height: 145, borderRadius: 4 }}
            />
          ) : (
            <View
              style={{
                width: 100,
                height: 145,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: c.line,
                backgroundColor: c.wash,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ImagePlus size={26} color={c.accent} />
            </View>
          )}
          <Button
            secondary
            title={cover ? "画像を変更する" : "画像を選択（任意）"}
            onPress={async () => {
              setError(undefined);
              try {
                const uri = await selectBookImage();
                if (uri) setCover(uri);
              } catch (err) {
                setError(err);
              }
            }}
          />
          {cover && (
            <Button
              secondary
              title="画像を外す"
              icon={false}
              onPress={() => setCover(undefined)}
            />
          )}
        </View>
        <Controller
          control={control}
          name="title"
          render={({ field }) => (
            <Field
              label="本のタイトル"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.title?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="author"
          render={({ field }) => (
            <Field
              label="著者"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.author?.message}
            />
          )}
        />
        <ErrorMessage error={error || save.error} />
        <Button
          title="この本を登録する"
          loading={busy}
          onPress={handleSubmit(async (values) => {
            setBusy(true);
            setError(undefined);
            try {
              const coverUri = cover
                ? await persistBookImage(cover)
                : undefined;
              const id = await save.mutateAsync({ ...values, coverUri });
              reset();
              setCover(undefined);
              onRegistered(id);
            } catch (err) {
              setError(err);
            } finally {
              setBusy(false);
            }
          })}
        />
      </Screen>
    </Modal>
  );
}
