import { router } from "expo-router";
import { Empty, Screen } from "@/components/ui";
export default function NotFound() {
  return (
    <Screen>
      <Empty
        title="少し、道を外れたようです。"
        description="このページは見つかりませんでした。"
        action="Todayへ戻る"
        onPress={() => router.replace("/")}
      />
    </Screen>
  );
}
