import { useState } from "react";
import { router } from "expo-router";
import { Alert, Platform, Pressable, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { dataKey, useTadori, useAction } from "@/hooks/useTadori";
import { apiUrl } from "@/api/client";
import { deleteAccount, signOut } from "@/lib/auth";
import { repository } from "@/api/repository";
import { colors as c } from "@/lib/theme";
export default function Settings() {
  const q = useTadori();
  const save = useAction(repository.saveProfile);
  const [bio, setBio] = useState<string | null>(null);
  const client = useQueryClient();
  const leave = useMutation({
    mutationFn: (action: "signout" | "delete") =>
      action === "delete" ? deleteAccount() : signOut(),
    onSuccess: async () => {
      await client.resetQueries({ queryKey: dataKey });
      router.replace("/login");
    },
  });
  const confirmDelete = () => {
    const message =
      "作成したRoadmap・Circle、学習の進捗がすべて削除されます。元に戻せません。";
    if (Platform.OS === "web") {
      if (window.confirm(message)) leave.mutate("delete");
      return;
    }
    Alert.alert("アカウントを削除しますか？", message, [
      { text: "キャンセル", style: "cancel" },
      { text: "削除する", style: "destructive", onPress: () => leave.mutate("delete") },
    ]);
  };
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
      {apiUrl && (
        <View style={{ gap: 12 }}>
          <ErrorMessage error={leave.error} />
          <Button
            title="ログアウト"
            secondary
            icon={false}
            loading={leave.isPending}
            onPress={() => leave.mutate("signout")}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete account"
            disabled={leave.isPending}
            onPress={confirmDelete}
          >
            <Txt style={{ color: c.error, fontSize: 13, textAlign: "center" }}>
              アカウントを削除
            </Txt>
          </Pressable>
        </View>
      )}
      <Txt muted style={{ fontSize: 11, textAlign: "center" }}>
        Tadori 1.0 · 誰かが作った学びの道を、辿る。
      </Txt>
    </Screen>
  );
}
