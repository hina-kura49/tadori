import { JourneyCoach } from "@/components/JourneyCoach";
import { useJourney } from "@/hooks/useJourney";
import { firstPaths } from "@/lib/journey";
import { AppHeader } from "@/components/AppHeader";
import { useState } from "react";
import { View, TextInput, ScrollView } from "react-native";
import { Search, SlidersHorizontal } from "lucide-react-native";
import { categories } from "@/types/domain";
import { useTadori } from "@/hooks/useTadori";
import {
  Chip,
  DataError,
  Empty,
  Label,
  Loading,
  PageTitle,
  Row,
  Screen,
  Txt,
} from "@/components/ui";
import { RoadmapCard } from "@/components/RoadmapCard";
import { colors as c } from "@/lib/theme";
export default function Explore() {
  const q = useTadori();
  const tour = useJourney();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  if (q.isPending) return <Loading />;
  if (!q.data) return <DataError retry={() => q.refetch()} />;
  const d = q.data;
  const candidates =
    tour.ready &&
    tour.state.stage === "explore" &&
    !search &&
    category === "All"
      ? firstPaths(d.roadmaps, d.profile.interests)
      : d.roadmaps;
  const found = candidates.filter(
    (r) =>
      r.visibility === "PUBLIC" &&
      (category === "All" || r.category === category) &&
      `${r.title} ${r.description} ${r.creator}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <Screen gap={20} refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
      <AppHeader
        title="Explore"
        description="どこへ向かうか。どの道を辿るか。"
      />
      <JourneyCoach screen="explore" />
      <Row
        style={{
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: 9,
          paddingHorizontal: 14,
          backgroundColor: c.white,
        }}
      >
        <Search size={19} color={c.muted} />
        <TextInput
          accessibilityLabel="Roadmapを検索"
          placeholder="Roadmap、テーマ、つくった人"
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#94948E"
          style={{ flex: 1, paddingVertical: 15, fontSize: 13, color: c.ink }}
        />
      </Row>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -24 }}
        contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
      >
        {["All", ...categories].map((cat) => (
          <Chip
            title={cat === "All" ? "すべて" : cat}
            key={cat}
            selected={category === cat}
            onPress={() => setCategory(cat)}
          />
        ))}
      </ScrollView>
      <View style={{ gap: 18 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <Txt style={{ fontSize: 16, fontWeight: "500" }}>
            {search
              ? "Search results"
              : category === "All"
                ? "Curated paths"
                : category}
          </Txt>
          <Txt muted style={{ fontSize: 11 }}>
            {found.length} roadmaps
          </Txt>
        </Row>
        {found.map((r) => (
          <RoadmapCard
            key={r.id}
            roadmap={r}
            books={d.books}
            enrollment={d.enrollments.find((e) => e.roadmapId === r.id)}
          />
        ))}
        {!found.length && (
          <Empty
            title="まだ見ぬ道を、つくろう。"
            description="条件に合うRoadmapがありません。検索語やカテゴリを変えてみてください。"
            action="条件をリセット"
            onPress={() => {
              setSearch("");
              setCategory("All");
            }}
          />
        )}
      </View>
      <Txt muted style={{ textAlign: "center", fontSize: 11 }}>
        一冊の出会いが、次の道をひらく。
      </Txt>
    </Screen>
  );
}
