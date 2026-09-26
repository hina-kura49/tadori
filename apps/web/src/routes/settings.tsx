import { ArrowLeft } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import { Button, Card, ErrorMessage, Input, Label, Loading, Page } from "@/components/ui";
import { Toggle } from "@/components/me/Toggle";
import { useUpdateMe } from "@/hooks/me/useDashboard";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/hooks/me/useNotificationPreferences";
import { useLeave } from "@/hooks/me/useSignOut";
import { useMe } from "@/hooks/useMe";

const USERNAME = /^[a-z0-9_]{3,30}$/;

export default function SettingsScreen() {
  return (
    <Page eyebrow="Settings" title="Your own pace.">
      <Link to="/me" className="-mt-4 mb-8 inline-flex items-center gap-1 text-sm text-accent">
        <ArrowLeft size={16} />
        Me に戻る
      </Link>
      <div className="space-y-10">
        <ProfileSection />
        <NotificationSection />
        <DangerSection />
      </div>
    </Page>
  );
}

function ProfileSection() {
  const { data: me } = useMe();
  const save = useUpdateMe();
  const [draft, setDraft] = useState<{ name?: string; username?: string; bio?: string }>({});
  if (!me) return <Loading />;

  const name = draft.name ?? me.name;
  const username = draft.username ?? me.username;
  const bio = draft.bio ?? me.bio ?? "";
  const usernameError = !USERNAME.test(username) ? "半角の英小文字・数字・_ で 3〜30 文字にしてください" : undefined;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const changes = {
      ...(name.trim() !== me.name && { name: name.trim() }),
      ...(username !== me.username && { username }),
      ...(bio.trim() !== (me.bio ?? "") && { bio: bio.trim() || null }),
    };
    if (Object.keys(changes).length === 0) return;
    save.mutate(changes, { onSuccess: () => setDraft({}) });
  };
  const errorMessage =
    save.error && "code" in save.error && save.error.code === "USERNAME_TAKEN" ? "この username はすでに使われています" : save.error?.message;

  return (
    <section className="space-y-3">
      <Label>Profile</Label>
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="表示名" name="name" required maxLength={80} value={name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          <Input
            label="username"
            name="username"
            autoCapitalize="none"
            value={username}
            error={usernameError}
            onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value.toLowerCase() }))}
          />
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">自己紹介</span>
            <textarea
              name="bio"
              rows={4}
              maxLength={500}
              value={bio}
              onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
            <span className="mt-1 block text-right text-[11px] text-muted">{bio.length} / 500</span>
          </label>
          {errorMessage && <p className="text-sm text-error">{errorMessage}</p>}
          {save.isSuccess && Object.keys(draft).length === 0 && <p className="text-sm text-accent">プロフィールを保存しました。</p>}
          <Button type="submit" loading={save.isPending} disabled={!!usernameError || Object.keys(draft).length === 0}>
            プロフィールを保存
          </Button>
        </form>
      </Card>
    </section>
  );
}

function NotificationSection() {
  const { data: p, isPending, error, refetch } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  return (
    <section id="notifications" className="scroll-mt-20 space-y-3">
      <Label>Notifications</Label>
      <p className="text-xs text-muted">通知はスマホアプリに届きます。ここでの設定はアプリと共通です。</p>
      {isPending ? (
        <Loading />
      ) : error ? (
        <ErrorMessage error={error} onRetry={() => refetch()} />
      ) : (
        <Card className="divide-y divide-line py-2">
          <div>
            <Toggle
              label="学習リマインダー"
              description="毎日決まった時刻に、今日の一歩をお知らせします"
              checked={p.studyReminderEnabled}
              disabled={update.isPending}
              onChange={(v) => update.mutate({ studyReminderEnabled: v })}
            />
            {p.studyReminderEnabled && (
              <label className="flex items-center justify-between gap-4 pb-3 text-sm">
                <span className="text-muted">時刻（{p.studyReminderTimezone}）</span>
                <input
                  type="time"
                  defaultValue={p.studyReminderTime}
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (value && value !== p.studyReminderTime) {
                      update.mutate({ studyReminderTime: value, studyReminderTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
                    }
                  }}
                  className="rounded-lg border border-line bg-white px-3 py-1.5"
                />
              </label>
            )}
          </div>
          <Toggle label="サークルのリマインダー" description="読書会の予定や、新しいメンバーの参加" checked={p.circleReminderEnabled} disabled={update.isPending} onChange={(v) => update.mutate({ circleReminderEnabled: v })} />
          <Toggle label="進捗のお知らせ" description="ロードマップの完走や、次の一冊の案内" checked={p.progressNotificationEnabled} disabled={update.isPending} onChange={(v) => update.mutate({ progressNotificationEnabled: v })} />
          <Toggle label="招待のお知らせ" description="サークルに招待されたとき" checked={p.inviteNotificationEnabled} disabled={update.isPending} onChange={(v) => update.mutate({ inviteNotificationEnabled: v })} />
        </Card>
      )}
      {update.error && <p className="text-sm text-error">{update.error.message}</p>}
    </section>
  );
}

function DangerSection() {
  const leave = useLeave();
  const [confirming, setConfirming] = useState(false);
  return (
    <section className="space-y-3">
      <Label>Account</Label>
      <Card className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" loading={leave.isPending && leave.variables === "signout"} onClick={() => leave.mutate("signout")}>
            ログアウト
          </Button>
          {!confirming && (
            <Button variant="danger" onClick={() => setConfirming(true)}>
              アカウントを削除
            </Button>
          )}
        </div>
        {confirming && (
          <div role="alertdialog" aria-labelledby="delete-title" className="space-y-3 rounded-xl border border-error/30 bg-error/5 p-4">
            <p id="delete-title" className="font-medium text-error">アカウントを削除しますか？</p>
            <p className="text-sm">作成したロードマップ・サークル、学習の進捗がすべて削除されます。元に戻せません。</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="danger" loading={leave.isPending && leave.variables === "delete"} onClick={() => leave.mutate("delete")}>
                削除する
              </Button>
              <Button variant="ghost" disabled={leave.isPending} onClick={() => setConfirming(false)}>
                キャンセル
              </Button>
            </div>
          </div>
        )}
        {leave.error && <p className="text-sm text-error">{leave.error.message}</p>}
      </Card>
    </section>
  );
}
