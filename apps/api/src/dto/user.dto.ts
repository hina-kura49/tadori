// 他の DTO に埋め込む最小限の User 情報。email などの非公開情報は含めない。
export type UserSummaryDto = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
};

export function toUserSummaryDto(user: UserSummaryDto): UserSummaryDto {
  return { id: user.id, name: user.name, username: user.username, avatarUrl: user.avatarUrl };
}

/** GET /me, PATCH /me */
export type CurrentUserDto = UserSummaryDto & {
  email: string;
  bio: string | null;
  /**
   * false なら username は自動採番された仮のもの (Apple / Google で登録した直後)。
   * アプリは onboarding で username を決めてもらい、PATCH /me { username } を呼ぶ。
   */
  usernameConfirmed: boolean;
  createdAt: string;
};
