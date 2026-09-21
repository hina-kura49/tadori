import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { MapPin, Compass, Plus, Users, UserRound } from "lucide-react-native";
import { colors as c } from "@/lib/theme";
export default function TabLayout() {
  const bottom = Math.max(useSafeAreaInsets().bottom, 12);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: "#92958E",
        tabBarStyle: {
          backgroundColor: c.paper,
          borderTopColor: c.line,
          height: 62 + bottom,
          paddingTop: 10,
          paddingBottom: bottom,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "500", marginTop: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color }) => <MapPin size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color }) => <Compass size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarIcon: () => (
            <View
              style={{
                backgroundColor: c.accent,
                borderRadius: 22,
                padding: 9,
                marginTop: -8,
              }}
            >
              <Plus size={22} color="white" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="circles"
        options={{
          title: "Circles",
          tabBarIcon: ({ color }) => <Users size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: "Me",
          tabBarIcon: ({ color }) => <UserRound size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
