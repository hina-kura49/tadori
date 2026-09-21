import type { BookRow } from "../repositories/book.repository";
import type { RoadmapSummaryDto } from "./roadmap.dto";

export type BookSummaryDto = {
  id: string;
  title: string;
  author: string;
  coverImageUrl: string | null;
};

export type BookDto = BookSummaryDto & {
  isbn13: string | null;
  subtitle: string | null;
  publisher: string | null;
  description: string | null;
  publishedAt: string | null;
  createdAt: string;
};

/** GET /books/:id */
export type BookDetailDto = BookDto & {
  /** この Book を含む PUBLIC Roadmap (新しい順・最大 10 件) */
  publicRoadmaps: RoadmapSummaryDto[];
};

export function toBookSummaryDto(book: BookSummaryDto): BookSummaryDto {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    coverImageUrl: book.coverImageUrl,
  };
}

export function toBookDto(book: BookRow): BookDto {
  return {
    ...toBookSummaryDto(book),
    isbn13: book.isbn13,
    subtitle: book.subtitle,
    publisher: book.publisher,
    description: book.description,
    publishedAt: book.publishedAt,
    createdAt: book.createdAt.toISOString(),
  };
}
