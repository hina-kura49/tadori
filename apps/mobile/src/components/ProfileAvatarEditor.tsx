import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { Camera, X } from "lucide-react-native";
import {
  Avatar,
  Button,
  ErrorMessage,
  IconButton,
  Row,
  Screen,
  Txt,
} from "./ui";
import { useAction } from "@/hooks/useTadori";
import { repository } from "@/api/repository";
import { persistProfileImage, selectProfileImage } from "@/lib/bookImages";
import { colors as c } from "@/lib/theme";
import type { Profile } from "@/types/domain";

export function ProfileAvatarEditor({ profile }: { profile: Profile }) {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const save = useAction(repository.saveProfile);
  const close = () => {
    if (!busy) setVisible(false);
  };
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="プロフィールアイコンを変更"
        onPress={() => {
          setDraft(profile.avatarUri);
          setError(undefined);
          setVisible(true);
        }}
        style={{ width: 58, height: 58 }}
      >
        <Avatar name={profile.name || "T"} uri={profile.avatarUri} size={54} />
        <View
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            padding: 4,
            borderRadius: 12,
            backgroundColor: c.accent,
            borderWidth: 2,
            borderColor: c.paper,
          }}
        >
          <Camera size={11} color={c.paper} />
        </View>
      </Pressable>
      <Modal
        visible={visible}
        presentationStyle="pageSheet"
        animationType="slide"
        onRequestClose={close}
      >
        <Screen>
          <Row style={{ justifyContent: "space-between" }}>
            <Txt style={{ fontSize: 22, fontWeight: "500" }}>
              プロフィールアイコン
            </Txt>
            <IconButton label="アイコン編集を閉じる" onPress={close}>
              <X size={22} color={c.ink} />
            </IconButton>
          </Row>
          <View style={{ alignItems: "center", paddingVertical: 28, gap: 16 }}>
            <Avatar name={profile.name || "T"} uri={draft} size={120} />
            <Txt muted>あなたらしい一枚を。</Txt>
          </View>
          <Button
            title="写真から選ぶ"
            secondary
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              setError(undefined);
              try {
                const uri = await selectProfileImage();
                if (uri) setDraft(uri);
              } catch (err) {
                setError(err);
              } finally {
                setBusy(false);
              }
            }}
          />
          {draft && (
            <Button
              title="イニシャルに戻す"
              secondary
              disabled={busy}
              icon={false}
              onPress={() => setDraft(undefined)}
            />
          )}
          <ErrorMessage error={error} />
          <Button
            title="保存する"
            loading={busy}
            onPress={async () => {
              setBusy(true);
              setError(undefined);
              try {
                const avatarUri =
                  draft && draft !== profile.avatarUri
                    ? await persistProfileImage(draft)
                    : draft;
                await save.mutateAsync({ ...profile, avatarUri });
                setVisible(false);
              } catch (err) {
                setError(err);
              } finally {
                setBusy(false);
              }
            }}
          />
        </Screen>
      </Modal>
    </>
  );
}
