import { useState, type FormEvent } from "react";
import { Button, ErrorMessage, Input } from "@/components/ui";
import { useCircleActions } from "@/hooks/circle/useCircles";

/** オーナーがユーザー名で招待する */
export function InviteForm({ circleId }: { circleId: string }) {
  const { invite } = useCircleActions(circleId);
  const [username, setUsername] = useState("");
  const [sent, setSent] = useState<string>();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const name = username.trim().replace(/^@/, "");
    if (!name) return;
    invite.mutate(name, { onSuccess: () => { setSent(name); setUsername(""); } });
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex gap-2">
        <Input name="inviteUsername" placeholder="招待するユーザー名（@なしでOK）" value={username} onChange={(e) => { setUsername(e.target.value); setSent(undefined); }} autoCapitalize="none" />
        <Button type="submit" variant="secondary" className="shrink-0" loading={invite.isPending} disabled={!username.trim()}>
          招待
        </Button>
      </div>
      {sent && <p className="text-xs text-accent">@{sent} を招待しました。</p>}
      {invite.error && <ErrorMessage error={invite.error} />}
    </form>
  );
}
