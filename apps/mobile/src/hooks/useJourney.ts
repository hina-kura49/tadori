import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTadori } from "./useTadori";
import { storage } from "@/lib/storage";
import type { Journey } from "@/lib/journey";
const stages = [
  "welcome",
  "interests",
  "explore",
  "today",
  "circles",
  "me",
  "done",
];
export function useJourney() {
  const profile = useTadori().data?.profile;
  const client = useQueryClient();
  const key = ["journey", profile?.id ?? "local"];
  // Persist the tour on this installation; profile edits do not restart it.
  const storageKey = profile?.id
    ? `tadori.journey.v1.${profile.id}`
    : "tadori.journey.v1";
  const q = useQuery({
    queryKey: key,
    enabled: !!profile,
    queryFn: async (): Promise<Journey | null> => {
      const raw = await storage.get(storageKey);
      if (!raw) return null;
      const value = JSON.parse(raw) as Journey;
      return stages.includes(value.stage) ? value : null;
    },
  });
  const save = useMutation({
    mutationFn: async (value: Journey) => {
      await storage.set(storageKey, JSON.stringify(value));
      return value;
    },
    onSuccess: (value) => {
      client.setQueryData(key, value);
    },
  });
  return {
    state:
      q.data ?? ({ stage: profile?.onboarded ? "done" : "welcome" } as Journey),
    ready: !!profile && q.isSuccess,
    error: q.error || save.error,
    busy: save.isPending,
    set: save.mutateAsync,
  };
}
