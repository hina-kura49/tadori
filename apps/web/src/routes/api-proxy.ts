import { proxy } from "@/lib/proxy.server";
import type { Route } from "./+types/api-proxy";

// /_api/* を API へそのまま中継するリソースルート (画面を持たない)。
// GET / HEAD は loader、それ以外のメソッドは action に来る。
export const loader = ({ request, params }: Route.LoaderArgs) => proxy(request, params["*"] ?? "");
export const action = ({ request, params }: Route.ActionArgs) => proxy(request, params["*"] ?? "");
