/** ロードマップの道のり。完了・いま・これから を点と線で表す */
export function PathRail({ count, current, completed }: { count: number; current: number; completed: number[] }) {
  return (
    <ol className="flex items-center" aria-label={`全 ${count} ステップ`}>
      {Array.from({ length: count }, (_, i) => {
        const done = completed.includes(i);
        const here = i === current;
        return (
          <li key={i} className="flex flex-1 items-center last:flex-none">
            <span
              aria-label={`STEP ${i + 1}${done ? "（完了）" : here ? "（いま、ここ）" : ""}`}
              className={
                here
                  ? "size-4 rounded-full border-4 border-accent bg-white"
                  : done
                    ? "size-3 rounded-full bg-accent"
                    : "size-3 rounded-full border-2 border-line bg-white"
              }
            />
            {i < count - 1 && <span className={`h-0.5 flex-1 ${done ? "bg-accent" : "bg-line"}`} />}
          </li>
        );
      })}
    </ol>
  );
}
