import { ArrowLeft, BookOpen, Check, Link2, Route } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ApiError } from "@/api/client";
import { Avatar } from "@/components/Avatar";
import { ConfirmButton } from "@/components/circle/ConfirmButton";
import { InviteForm } from "@/components/circle/InviteForm";
import { ScheduleSection } from "@/components/circle/ScheduleSection";
import { Button, ButtonLink, Card, Empty, ErrorMessage, Label, Loading, Page } from "@/components/ui";
import { useCircle, useCircleActions } from "@/hooks/circle/useCircles";

export default function CircleDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const q = useCircle(id);
  const actions = useCircleActions(id);
  const [copied, setCopied] = useState(false);

  if (q.isPending) return <Loading />;
  if (q.error) {
    if (q.error instanceof ApiError && q.error.status === 404) {
      return (
        <Page>
          <Empty title="Circleが見つかりません">
            <p>リンクを確認してください。招待制のCircleは、招待された人だけが見られます。</p>
            <ButtonLink to="/circles" variant="secondary" className="mt-4">Circles へ戻る</ButtonLink>
          </Empty>
        </Page>
      );
    }
    return <Page><ErrorMessage error={q.error} onRetry={() => q.refetch()} /></Page>;
  }

  const circle = q.data;
  const { role, isInvited } = circle.viewer;
  const isOwner = role === "OWNER";
  const joined = role !== null;
  const full = circle.memberCount >= circle.maxMembers;
  const canJoin = !joined && !full && (circle.visibility === "PUBLIC" || isInvited);

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Page>
      <Link to="/circles" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={16} />
        Circles
      </Link>

      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Label>{circle.visibility === "PUBLIC" ? "Open circle" : "Invite only"}</Label>
          <h1 className="mt-1 font-serif text-3xl leading-tight break-words md:text-4xl">{circle.name}</h1>
          {circle.description && <p className="mt-3 text-sm whitespace-pre-wrap text-muted">{circle.description}</p>}
        </div>
        <Button variant="secondary" className="shrink-0 px-3" onClick={copyLink} aria-label="リンクをコピー">
          {copied ? <Check size={16} /> : <Link2 size={16} />}
          <span className="hidden sm:inline">{copied ? "コピーしました" : "リンクをコピー"}</span>
        </Button>
      </header>

      <div className="space-y-5">
        <TargetCard target={circle.target} />

        <ScheduleSection
          circleId={circle.id}
          schedules={circle.schedules}
          isOwner={isOwner}
          startDate={circle.startDate}
          targetEndDate={circle.targetEndDate}
        />

        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Members</Label>
            <span className="text-xs text-muted">{circle.memberCount} / {circle.maxMembers}</span>
          </div>
          <ul className="grid grid-cols-3 gap-4 sm:grid-cols-5">
            {circle.members.map((m) => (
              <li key={m.user.id}>
                <Link to={`/profile/${m.user.username}`} className="flex flex-col items-center gap-1.5 text-center hover:opacity-80">
                  <Avatar name={m.user.name} url={m.user.avatarUrl} />
                  <span className="w-full truncate text-xs">{m.user.name}</span>
                  {m.role === "OWNER" && <span className="text-[10px] text-accent">オーナー</span>}
                </Link>
              </li>
            ))}
          </ul>
          {isOwner && <div className="border-t border-line pt-4"><InviteForm circleId={circle.id} /></div>}
        </Card>

        <div className="space-y-3 pt-2">
          {!joined && (
            <Button className="w-full" disabled={!canJoin} loading={actions.join.isPending} onClick={() => actions.join.mutate()}>
              {canJoin
                ? isInvited ? "招待を受けて参加する" : "このCircleに参加する"
                : full ? "満員です" : "参加には招待が必要です"}
            </Button>
          )}
          {role === "MEMBER" && (
            <>
              <p className="text-center text-sm text-accent">参加しています</p>
              <ConfirmButton
                variant="secondary"
                label="このCircleから抜ける"
                question="このCircleから抜けますか？"
                confirmLabel="抜ける"
                loading={actions.leave.isPending}
                onConfirm={() => actions.leave.mutate(undefined, { onSuccess: () => navigate("/circles", { replace: true }) })}
              />
            </>
          )}
          {isOwner && (
            <ConfirmButton
              label="このCircleを削除する"
              question="削除すると予定やメンバーも消え、元に戻せません。削除しますか？"
              confirmLabel="削除する"
              loading={actions.remove.isPending}
              onConfirm={() => actions.remove.mutate(undefined, { onSuccess: () => navigate("/circles", { replace: true }) })}
            />
          )}
          {(actions.join.error || actions.leave.error || actions.remove.error) && (
            <ErrorMessage error={actions.join.error ?? actions.leave.error ?? actions.remove.error} />
          )}
        </div>
      </div>
    </Page>
  );
}

type Target =
  | { type: "BOOK"; book: { id: string; title: string; author: string; coverImageUrl: string | null } }
  | { type: "ROADMAP"; roadmap: { id: string; slug: string; title: string } };

/** 一緒に学ぶ対象 (本 or ロードマップ) */
function TargetCard({ target }: { target: Target }) {
  if (target.type === "BOOK") {
    const { book } = target;
    return (
      <Link to={`/books/${book.id}`} className="flex gap-5 rounded-2xl bg-wash p-5 hover:bg-wash/70">
        {book.coverImageUrl ? (
          <img src={book.coverImageUrl} alt="" className="h-24 w-16 shrink-0 rounded object-cover shadow-sm" />
        ) : (
          <span className="flex h-24 w-16 shrink-0 items-center justify-center rounded bg-white text-accent shadow-sm">
            <BookOpen size={22} />
          </span>
        )}
        <div className="min-w-0 space-y-1.5">
          <Label>Current book</Label>
          <p className="text-lg leading-snug font-medium">{book.title}</p>
          <p className="text-xs text-muted">{book.author}</p>
        </div>
      </Link>
    );
  }
  return (
    <Link to={`/roadmaps/${target.roadmap.slug}`} className="flex items-center gap-4 rounded-2xl bg-wash p-5 hover:bg-wash/70">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-accent">
        <Route size={22} />
      </span>
      <div className="min-w-0 space-y-1">
        <Label>Roadmap</Label>
        <p className="text-lg leading-snug font-medium">{target.roadmap.title}</p>
        <p className="text-xs text-accent">ロードマップを見る →</p>
      </div>
    </Link>
  );
}
