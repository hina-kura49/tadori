import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/api/client";
import type { Category, Difficulty, Visibility } from "@/lib/roadmap/labels";
import { roadmapKeys } from "./queries";

export interface PickedBook {
  id: string;
  title: string;
  author: string;
  coverImageUrl: string | null;
}

export interface RoadmapDraft {
  title: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  estimatedDays: number | null;
  visibility: Visibility;
  steps: { book: PickedBook; checkpoint: string; description: string; estimatedDays: number | null }[];
}

/** Roadmap を作り、Step を順に追加する。途中で失敗したら Roadmap ごと取り消す (mobile と同じ) */
export function useCreateRoadmap() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (draft: RoadmapDraft) => {
      const roadmap = await unwrap(
        api.roadmaps.index.$post({
          json: {
            title: draft.title,
            description: draft.description.trim() || null,
            category: draft.category,
            difficulty: draft.difficulty,
            estimatedDays: draft.estimatedDays,
            visibility: draft.visibility,
          },
        }),
      );
      try {
        for (const step of draft.steps)
          await unwrap(
            api.roadmaps[":id"].steps.$post({
              param: { id: roadmap.id },
              json: {
                bookId: step.book.id,
                checkpoint: step.checkpoint,
                description: step.description.trim() || null,
                estimatedDays: step.estimatedDays,
              },
            }),
          );
      } catch (error) {
        await api.roadmaps[":id"].$delete({ param: { id: roadmap.id } }).catch(() => {});
        throw error;
      }
      return roadmap;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: roadmapKeys.all }),
  });
}

/** 本を新しく登録する */
export function useCreateBook() {
  return useMutation({
    mutationFn: (input: { title: string; author: string; coverImageUrl: string | null }) =>
      unwrap(api.books.index.$post({ json: input })),
  });
}
