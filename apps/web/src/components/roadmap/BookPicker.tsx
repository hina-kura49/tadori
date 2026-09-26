import { Search, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, ErrorMessage, Input, Spinner } from "@/components/ui";
import { useBookSearch } from "@/hooks/roadmap/queries";
import { useCreateBook, type PickedBook } from "@/hooks/roadmap/useCreateRoadmap";
import { BookCover } from "@/components/BookCover";

/** 本を選ぶダイアログ。検索して選ぶか、見つからなければその場で登録する */
export function BookPicker({ onPick, onClose, exclude }: {
  onPick: (book: PickedBook) => void;
  onClose: () => void;
  exclude: string[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [registering, setRegistering] = useState(false);
  const search = useBookSearch(q);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => setQ(input.trim()), 300);
    return () => clearTimeout(timer);
  }, [input]);

  const books = search.data?.items.filter((b) => !exclude.includes(b.id)) ?? [];

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-paper p-0 text-ink backdrop:bg-ink/40"
    >
      <div className="flex max-h-[80dvh] flex-col">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-serif text-xl">{registering ? "新しい本を登録する" : "本を選ぶ"}</h2>
          <button type="button" aria-label="閉じる" onClick={() => dialog.current?.close()} className="rounded-full p-1.5 hover:bg-wash">
            <X size={18} />
          </button>
        </div>
        {registering ? (
          <NewBookForm
            initialTitle={input}
            onCancel={() => setRegistering(false)}
            onCreated={(book) => {
              onPick(book);
              dialog.current?.close();
            }}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3 p-5">
            <label className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 focus-within:border-accent">
              <Search size={17} className="text-muted" />
              <input
                autoFocus
                type="search"
                aria-label="本を検索"
                placeholder="タイトル・著者で検索"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-transparent py-3 text-sm outline-none"
              />
            </label>
            <div className="min-h-40 flex-1 overflow-y-auto">
              {search.isPending ? (
                <div className="flex justify-center py-8 text-accent"><Spinner /></div>
              ) : search.isError ? (
                <ErrorMessage error={search.error} onRetry={() => search.refetch()} />
              ) : books.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">見つかりませんでした。</p>
              ) : (
                <ul className="divide-y divide-line">
                  {books.map((book) => (
                    <li key={book.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onPick(book);
                          dialog.current?.close();
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-wash"
                      >
                        <BookCover book={book} width={36} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{book.title}</span>
                          <span className="block truncate text-xs text-muted">{book.author}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button variant="secondary" onClick={() => setRegistering(true)}>
              見つからない本を登録する
            </Button>
          </div>
        )}
      </div>
    </dialog>
  );
}

function NewBookForm({ initialTitle, onCancel, onCreated }: {
  initialTitle: string;
  onCancel: () => void;
  onCreated: (book: PickedBook) => void;
}) {
  const create = useCreateBook();
  const [title, setTitle] = useState(initialTitle);
  const [author, setAuthor] = useState("");
  const [cover, setCover] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const book = await create.mutateAsync({ title: title.trim(), author: author.trim(), coverImageUrl: cover.trim() || null });
    onCreated(book);
  }

  return (
    <form onSubmit={(e) => onSubmit(e).catch(() => {})} className="space-y-4 p-5">
      <Input label="タイトル *" name="book-title" required maxLength={300} value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input label="著者 *" name="book-author" required maxLength={300} value={author} onChange={(e) => setAuthor(e.target.value)} />
      <Input
        label="表紙画像の URL（任意）"
        name="book-cover"
        type="url"
        placeholder="https://"
        value={cover}
        onChange={(e) => setCover(e.target.value)}
      />
      {create.error && <ErrorMessage error={create.error} />}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>戻る</Button>
        <Button type="submit" loading={create.isPending} disabled={!title.trim() || !author.trim()}>
          登録して選ぶ
        </Button>
      </div>
    </form>
  );
}
