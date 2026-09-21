export const categories = [
  "Engineering",
  "Product",
  "Business",
  "Marketing",
  "Management",
  "Finance",
  "Design",
] as const;
export type Category = (typeof categories)[number];
export type ReadingStatus = "NOT_STARTED" | "READING" | "COMPLETED";
export type StepState = "COMPLETED" | "CURRENT" | "LOCKED" | "AVAILABLE";
export type Visibility = "PUBLIC" | "UNLISTED" | "PRIVATE";
export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  coverUri?: string;
  registeredBy?: string;
  color: string;
  shortTitle: string;
}
export interface Step {
  id: string;
  bookId: string;
  why: string;
  checkpoint: string;
  duration: string;
}
export interface Roadmap {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: Category;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  duration: string;
  visibility: Visibility;
  creator: string;
  creatorUsername: string;
  completedUsers: number;
  steps: Step[];
}
export interface BookProgress {
  percentage: number;
  status: ReadingStatus;
}
export interface Enrollment {
  roadmapId: string;
  progress: Record<string, BookProgress>;
  startedAt: string;
}
export interface Profile {
  name: string;
  username: string;
  bio: string;
  interests: Category[];
  onboarded: boolean;
}
export interface Circle {
  id: string;
  name: string;
  targetType: "Book" | "Roadmap";
  targetId: string;
  visibility: "PUBLIC" | "INVITE_ONLY";
  startDate: string;
  endDate: string;
  meeting: string;
  maxMembers: number;
  members: string[];
  memberProgress?: Record<string, { step: number; percentage: number }>;
  progress: number;
  currentStep: number;
  announcement: string;
}
export interface NotificationSettings {
  study: boolean;
  circle: boolean;
  progress: boolean;
  invite: boolean;
  time: string;
  weekdays: number[];
  roadmapId?: string;
}
export interface Database {
  version: 1;
  profile: Profile;
  roadmaps: Roadmap[];
  books: Book[];
  enrollments: Enrollment[];
  circles: Circle[];
  notifications: NotificationSettings;
}
export type RoadmapInput = Omit<
  Roadmap,
  "id" | "slug" | "creator" | "creatorUsername" | "completedUsers"
>;
export type CircleInput = Omit<
  Circle,
  | "id"
  | "members"
  | "memberProgress"
  | "progress"
  | "currentStep"
  | "announcement"
>;

export interface BookInput {
  title: string;
  author: string;
  coverUri?: string;
}
