import { BookOpen } from "lucide-react";

/** 本の表紙。画像がなければタイトル入りの無地の表紙を出す */
export function BookCover({ book, width = 56 }: {
  book: { title: string; coverImageUrl: string | null };
  width?: number;
}) {
  const style = { width, height: Math.round(width * 1.45) };
  if (book.coverImageUrl)
    return (
      <img
        src={book.coverImageUrl}
        alt=""
        loading="lazy"
        style={style}
        className="shrink-0 rounded-md border border-line object-cover shadow-sm"
      />
    );
  return (
    <div
      style={style}
      aria-hidden
      className="flex shrink-0 flex-col justify-between overflow-hidden rounded-md border border-accent/20 bg-wash p-1.5 text-accent shadow-sm"
    >
      <BookOpen size={Math.max(12, width / 5)} />
      {width >= 56 && <span className="line-clamp-3 font-serif text-[9px] leading-tight">{book.title}</span>}
    </div>
  );
}
