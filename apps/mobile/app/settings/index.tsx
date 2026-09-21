import { useState } from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { ArrowRight, Bell } from "lucide-react-native";
import {
  Button,
  Card,
  DataError,
  ErrorMessage,
  Field,
  Loading,
  PageTitle,
  Row,
  Screen,
  Txt,
} from "@/components/ui";
import { useTadori, useAction } from "@/hooks/useTadori";
import { repository } from "@/api/repository";
import { colors as c } from "@/lib/theme";
export default function Settings() {
  const q = useTadori();
  const save = useAction(repository.saveProfile);
  const [bio, setBio] = useState<string | null>(null);
  if (q.isPending) return <Loading />;
  if (!q.data) return <DataError retry={() => q.refetch()} />;
  return (
    <Screen back title="SETTINGS">
      <PageTitle
        title="Your own pace."
        description="あなたらしく、学びを続けるために。"
      />
      <Field
        label="Bio"
        multiline
        value={bio ?? q.data.profile.bio}
        maxLength={200}
        onChangeText={setBio}
      />
      <ErrorMessage error={save.error} />
      {save.isSuccess && (
        <Txt style={{ color: c.accent, fontSize: 12 }}>
          プロフィールを保存しました。
        </Txt>
      )}
      <Button
        title="プロフィールを保存"
        loading={save.isPending}
        onPress={() =>
          save.mutate({ ...q.data!.profile, bio: bio ?? q.data!.profile.bio })
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Notification Settings"
        onPress={() => router.push("/settings/notifications")}
      >
        <Card>
          <Row>
            <Bell size={20} color={c.accent} />
            <View style={{ flex: 1 }}>
              <Txt style={{ fontWeight: "600" }}>Notifications</Txt>
              <Txt muted style={{ fontSize: 12 }}>
                学習リマインダー・Circle通知
              </Txt>
            </View>
            <ArrowRight size={18} color={c.accent} />
          </Row>
        </Card>
      </Pressable>
      <Txt muted style={{ fontSize: 11, textAlign: "center" }}>
        Tadori 1.0 · 誰かが作った学びの道を、辿る。
      </Txt>
    </Screen>
  );
}
