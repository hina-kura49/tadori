import "../global.css";
import { useEffect, useState } from "react";
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
  const { data, error } = useTadori();
  useEffect(() => observeNotifications(), []);
  // API 接続時のみ: 未ログイン、または session が切れたらログイン画面へ
  const needsLogin = isAuthError(error);
  useEffect(() => {
    if (needsLogin && path !== "/login") router.replace("/login");
  }, [needsLogin, path]);
  useEffect(() => {
    if (!needsLogin && data && !data.profile.onboarded && path === "/")
      router.replace("/onboarding");
  }, [needsLogin, data, path]);
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
