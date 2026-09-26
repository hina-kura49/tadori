/**
 * 公開ページ (/r/:slug) の URL を共有する。
 * 共有シートが使えればそれを開き、なければクリップボードにコピーする。結果のメッセージを返す。
 */
export async function shareRoadmap(roadmap: { title: string; slug: string }) {
  const url = `${window.location.origin}/r/${roadmap.slug}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: roadmap.title, url });
      return undefined;
    }
    await navigator.clipboard.writeText(url);
    return "リンクをコピーしました";
  } catch (error) {
    // 共有シートを閉じただけのときは何も出さない
    if (error instanceof DOMException && error.name === "AbortError") return undefined;
    return "共有できませんでした";
  }
}
