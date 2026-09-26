import { Route } from "lucide-react";
import { ButtonLink, Page } from "@/components/ui";

export default function NotFound() {
  return (
    <Page>
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 text-center">
        <Route size={48} strokeWidth={1.2} className="text-accent" />
        <h1 className="font-serif text-3xl">道が見つかりません。</h1>
        <p className="text-sm text-muted">お探しのページは移動したか、削除された可能性があります。</p>
        <ButtonLink to="/">Today に戻る</ButtonLink>
      </div>
    </Page>
  );
}
