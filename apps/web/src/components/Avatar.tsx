/** 丸いアイコン。画像がなければ名前の頭文字を出す */
export function Avatar({ name, url, size = 44 }: { name: string; url?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.4 };
  if (url && /^https?:\/\//.test(url)) {
    return <img src={url} alt="" style={style} className="shrink-0 rounded-full border-2 border-paper object-cover" />;
  }
  return (
    <span
      aria-hidden
      style={style}
      className="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-paper bg-wash font-serif text-accent"
    >
      {name.trim().charAt(0) || "?"}
    </span>
  );
}
