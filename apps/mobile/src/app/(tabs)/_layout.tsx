import { Tabs } from "expo-router/tabs";
import { BottomNav } from "@/components/BottomNav";
import { C } from "@/theme";

export default function TabsLayout() {
  return (
    <Tabs tabBar={props => <BottomNav {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg1 } }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="goals" />
      <Tabs.Screen name="inventory" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
