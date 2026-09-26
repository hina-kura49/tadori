// API の列挙値 (apps/api/src/db/schema/enums.ts) と画面の表示名の対応

export const CATEGORIES = [
  "ENGINEERING",
  "PRODUCT",
  "BUSINESS",
  "MARKETING",
  "MANAGEMENT",
  "FINANCE",
  "DESIGN",
  "OTHER",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const categoryLabel: Record<Category, string> = {
  ENGINEERING: "Engineering",
  PRODUCT: "Product",
  BUSINESS: "Business",
  MARKETING: "Marketing",
  MANAGEMENT: "Management",
  FINANCE: "Finance",
  DESIGN: "Design",
  OTHER: "Other",
};

export const DIFFICULTIES = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const difficultyLabel: Record<Difficulty, string> = {
  BEGINNER: "初級",
  INTERMEDIATE: "中級",
  ADVANCED: "上級",
};

export const VISIBILITIES = ["PUBLIC", "UNLISTED", "PRIVATE"] as const;
export type Visibility = (typeof VISIBILITIES)[number];
export const visibilityLabel: Record<Visibility, { title: string; description: string }> = {
  PUBLIC: { title: "公開", description: "Explore に載り、誰でも見られます" },
  UNLISTED: { title: "限定公開", description: "リンクを知っている人だけが見られます" },
  PRIVATE: { title: "非公開", description: "自分だけが見られます" },
};

/** estimatedDays を「約2週間」のような表示にする */
export function formatDays(days: number | null | undefined) {
  if (!days) return null;
  if (days >= 60 && days % 30 === 0) return `約${days / 30}か月`;
  if (days >= 14 && days % 7 === 0) return `約${days / 7}週間`;
  return `約${days}日`;
}
