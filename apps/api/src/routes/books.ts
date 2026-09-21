import { Hono } from "hono";
import { validate } from "../lib/validation";
import { requireAuth } from "../middleware/auth";
import { createBookSchema, listBooksQuerySchema } from "../schemas/book.schema";
import { idParamSchema } from "../schemas/common.schema";
import * as bookService from "../services/book.service";

// Route の責務は「入力を validate して Service を呼び、結果を JSON で返す」だけ。
// Hono RPC の型推論のため、必ずメソッドチェーンで定義する。
export const booksRoutes = new Hono()
  .get("/", validate("query", listBooksQuerySchema), async (c) => {
    const page = await bookService.listBooks(c.req.valid("query"));
    return c.json(page, 200);
  })
  .post("/", requireAuth, validate("json", createBookSchema), async (c) => {
    const book = await bookService.createBook(c.req.valid("json"));
    return c.json(book, 201);
  })
  .get("/:id", validate("param", idParamSchema), async (c) => {
    const book = await bookService.getBookDetail(c.req.valid("param").id);
    return c.json(book, 200);
  });

export type BooksRoutes = typeof booksRoutes;
