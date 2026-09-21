import type { MyRoadmapDto } from "../dto/my-roadmap.dto";
import type { LearningProfileDto, ProfileRoadmapDto } from "../dto/profile.dto";
import { type CurrentUserDto, toUserSummaryDto } from "../dto/user.dto";
import { isUniqueViolation } from "../lib/db-errors";
import { conflict, notFound } from "../lib/errors";
import * as userRepository from "../repositories/user.repository";
import type { UserRow } from "../repositories/user.repository";
import * as userRoadmapRepository from "../repositories/user-roadmap.repository";
import type { UpdateMeInput } from "../schemas/me.schema";
import type { AuthUser } from "../types/app";
import * as progressService from "./progress.service";
import * as roadmapService from "./roadmap.service";

const PROFILE_LIST_LIMIT = 20;

function toCurrentUserDto(user: UserRow): CurrentUserDto {
  return {
    ...toUserSummaryDto(user),
    email: user.email,
    bio: user.bio,
    usernameConfirmed: user.usernameConfirmed,
    createdAt: user.createdAt.toISOString(),
  };
}

function toProfileRoadmapDto(myRoadmap: MyRoadmapDto): ProfileRoadmapDto {
  return {
    roadmap: myRoadmap.roadmap,
    status: myRoadmap.status,
    progressPercentage: myRoadmap.progressPercentage,
    startedAt: myRoadmap.startedAt,
    completedAt: myRoadmap.completedAt,
  };
}

/** GET /me */
export async function getCurrentUser(authUser: AuthUser): Promise<CurrentUserDto> {
  const user = await userRepository.findUserById(authUser.id);
  if (!user) throw notFound("USER_NOT_FOUND", "User not found");
  return toCurrentUserDto(user);
}

/** PATCH /me */
export async function updateCurrentUser(
  authUser: AuthUser,
  input: UpdateMeInput,
): Promise<CurrentUserDto> {
  try {
    // username を「変えた」ときだけ、本人が決めたものとして確定済みにする。
    // アプリはプロフィール全体を送り直すので、仮の username がそのまま返ってくることがある。
    // それを確定扱いにすると、自動採番の名前 (user_3f9a...) のまま確定してしまう。
    const choseUsername = input.username !== undefined && input.username !== authUser.username;
    const user = await userRepository.updateUserProfile(authUser.id, {
      ...input,
      ...(choseUsername ? { usernameConfirmed: true } : {}),
    });
    if (!user) throw notFound("USER_NOT_FOUND", "User not found");
    return toCurrentUserDto(user);
  } catch (error) {
    if (isUniqueViolation(error)) throw conflict("USERNAME_TAKEN", "Username is already taken");
    throw error;
  }
}

/** GET /users/:username — PUBLIC Roadmap に関する情報だけで組み立てる */
export async function getLearningProfile(username: string): Promise<LearningProfileDto> {
  const user = await userRepository.findUserByUsername(username);
  if (!user) throw notFound("USER_NOT_FOUND", "User not found");

  const [booksCompleted, roadmapsCompleted, current, completed, createdRoadmaps] =
    await Promise.all([
      userRoadmapRepository.countCompletedBooks(user.id),
      userRoadmapRepository.countCompletedRoadmaps(user.id),
      progressService.listPublicRoadmapsOfUser(user.id, "IN_PROGRESS", PROFILE_LIST_LIMIT),
      progressService.listPublicRoadmapsOfUser(user.id, "COMPLETED", PROFILE_LIST_LIMIT),
      roadmapService.listRoadmapsCreatedBy(user.id, {
        publicOnly: true,
        limit: PROFILE_LIST_LIMIT,
      }),
    ]);

  return {
    user: { ...toUserSummaryDto(user), bio: user.bio, createdAt: user.createdAt.toISOString() },
    stats: { booksCompleted, roadmapsCompleted },
    currentRoadmaps: current.map(toProfileRoadmapDto),
    completedRoadmaps: completed.map(toProfileRoadmapDto),
    createdRoadmaps,
  };
}

/**
 * DELETE /me — アカウント削除 (App Store の審査要件)。
 * 本人が作った Roadmap・Circle、学習の進捗、端末、session まで CASCADE で消える。元に戻せない。
 */
export async function deleteCurrentUser(authUser: AuthUser): Promise<void> {
  await userRepository.deleteUser(authUser.id);
}
