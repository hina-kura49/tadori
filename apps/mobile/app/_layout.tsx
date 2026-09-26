import { useJourney } from "@/hooks/useJourney";
import { journeyRoute } from "@/lib/journey";
import "../global.css";
import { useEffect, useRef, useState } from "react";
import { Stack, router, usePathname } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTadori } from "@/hooks/useTadori";
import { isAuthError } from "@/api/client";
import { observeNotifications } from "@/lib/notifications";
import { colors } from "@/lib/theme";
export { ErrorBoundary } from "expo-router";
function Navigation() {
  const path = usePathname();
  const tour = useJourney();
  const resumed = useRef(false);
  const { data, error } = useTadori();
  useEffect(() => observeNotifications(), []);
  // API 接続時のみ: 未ログイン、または session が切れたらログイン画面へ
  const needsLogin = isAuthError(error);
  useEffect(() => {
    if (needsLogin) {
      resumed.current = false;
      if (path !== "/login") router.replace("/login");
    }
  }, [needsLogin, path]);
  useEffect(() => {
    if (needsLogin || !data || !tour.ready || resumed.current) return;
    resumed.current = true;
    if (path === "/") {
      const target = journeyRoute(tour.state.stage);
      if (target !== "/") router.replace(target);
    }
  }, [needsLogin, data, path, tour.ready, tour.state.stage]);
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen
        name="login"
        options={{ gestureEnabled: false, animation: "fade" }}
      />
    </Stack>
  );
}
export default function RootLayout() {
  const [client] = useState(() => new QueryClient());
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={client}>
          <StatusBar style="dark" />
          <Navigation />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
