import { type BookDetailDto, type BookDto, toBookDto } from "../dto/book.dto";
import { toRoadmapSummaryDto } from "../dto/roadmap.dto";
import { isUniqueViolation } from "../lib/db-errors";
import { conflict, notFound } from "../lib/errors";
import { buildPage, decodeCursor, type Page } from "../lib/pagination";
import * as bookRepository from "../repositories/book.repository";
import * as roadmapRepository from "../repositories/roadmap.repository";
import type { CreateBookInput, ListBooksQuery } from "../schemas/book.schema";

const BOOK_DETAIL_ROADMAP_LIMIT = 10;

export async function listBooks(query: ListBooksQuery): Promise<Page<BookDto>> {
  const rows = await bookRepository.searchBooks({
    q: query.q,
    cursor: query.cursor ? decodeCursor(query.cursor) : undefined,
    limit: query.limit + 1,
  });
  const page = buildPage(rows, query.limit);
  return { items: page.items.map(toBookDto), nextCursor: page.nextCursor };
}

export async function getBookDetail(bookId: string): Promise<BookDetailDto> {
  const book = await bookRepository.findBookById(bookId);
  if (!book) throw notFound("BOOK_NOT_FOUND", "Book not found");

  const roadmaps = await roadmapRepository.listRoadmapSummaries({
    visibility: "PUBLIC",
    bookId,
    limit: BOOK_DETAIL_ROADMAP_LIMIT,
  });
  return { ...toBookDto(book), publicRoadmaps: roadmaps.map(toRoadmapSummaryDto) };
}

export async function createBook(input: CreateBookInput): Promise<BookDto> {
  try {
    const book = await bookRepository.insertBook(input);
    return toBookDto(book);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict("BOOK_ALREADY_EXISTS", "A book with this ISBN already exists");
    }
    throw error;
  }
}
