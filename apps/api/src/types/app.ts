// Hono の Context に載せる値の型。

/** 認証済みユーザー。Service / Policy にはこの形で渡す */
export type AuthUser = {
  id: string;
  name: string;
  username: string;
};

/** requireAuth を通過した route 用。`c.get("user")` は必ず存在する */
export type AuthEnv = { Variables: { user: AuthUser } };

/** optionalAuth を通過した route 用。未ログインなら `c.get("viewer")` は null */
export type ViewerEnv = { Variables: { viewer: AuthUser | null } };
