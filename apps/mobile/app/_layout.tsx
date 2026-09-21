import "../global.css";
import { useEffect, useState } from "react";
import { Stack, router, usePathname } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTadori } from "@/hooks/useTadori";
import { observeNotifications } from "@/lib/notifications";
import { colors } from "@/lib/theme";
export { ErrorBoundary } from "expo-router";
function Navigation() {
  const path = usePathname();
  const { data } = useTadori();
  useEffect(() => observeNotifications(), []);
  useEffect(() => {
    if (data && !data.profile.onboarded && path === "/")
      router.replace("/onboarding");
  }, [data, path]);
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
