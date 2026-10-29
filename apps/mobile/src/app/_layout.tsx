import "@/lib/ignore-extension-errors";
import { useEffect } from "react";
import { Image, Platform, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from "@expo-google-fonts/plus-jakarta-sans";
import { Fredoka_700Bold } from "@expo-google-fonts/fredoka";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StoreProvider, useStore } from "@/lib/store";
import { Background, Btn, Toast } from "@/components/ui";
import { API_URL } from "@/lib/api";
import { useAutoUsageSync } from "@/lib/usage";
import { onRaidAlertTap, syncRaidAlert } from "@/lib/raidAlert";
import { C, T } from "@/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

function Root() {
  const { userId, state, error, refresh } = useStore();
  const [fonts] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, Fredoka_700Bold });
  const ready = fonts && userId !== undefined;
  useAutoUsageSync(!!userId && !!state, () => refresh());
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);
  // the Dim raid warning: a notification half an hour before, which opens Defend
  const raid = state?.raid ?? null;
  useEffect(() => { void syncRaidAlert(raid); }, [raid?.id, raid?.at, raid?.state, raid?.line]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => onRaidAlertTap(url => router.push(url as never)), []);
  if (!ready) return null;
  const signedIn = !!userId;

  // signed in but the server isn't answering: say so instead of showing empty screens
  if (signedIn && !state) {
    return (
      <Background style={{ alignItems: "center", justifyContent: "center", padding: 28, gap: 16 }}>
        <Image source={require("../../../web/public/renders/avatar.webp")} style={{ width: 96, height: 96, borderRadius: 48 }} />
        {error ? <>
          <Text style={[T.title, { textAlign: "center" }]}>Can't reach Bulbu's server</Text>
          <Text style={[T.muted, { textAlign: "center" }]}>Tried {API_URL}. Start it with “npm start” on your computer, and keep your phone on the same Wi-Fi.</Text>
          <Text style={[T.tiny, { textAlign: "center" }]}>{error}</Text>
          <View style={{ alignSelf: "stretch" }}><Btn title="Try again" icon="refresh" onPress={refresh} /></View>
        </> : <Text style={T.muted}>Waking Bulbu up…</Text>}
      </Background>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg1 }, animation: "slide_from_right" }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="setup" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="tell" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="chat" />
        <Stack.Screen name="focus" options={{ animation: "fade" }} />
        <Stack.Screen name="memory" />
        <Stack.Screen name="nudges" />
        <Stack.Screen name="screen-time" />
        <Stack.Screen name="letter" />
        <Stack.Screen name="building/[id]" />
      </Stack.Protected>
    </Stack>
  );
}

export default function Layout() {
  return (
    <SafeAreaProvider style={{ backgroundColor: "#E4EAFF" }}>
      <StoreProvider>
        <StatusBar style="dark" />
        {/* in a desktop browser, keep the app phone-width (as the web app does) */}
        <View style={Platform.OS === "web" ? { flex: 1, width: "100%", maxWidth: 460, alignSelf: "center", overflow: "hidden" } : { flex: 1 }}>
          <Root />
          <Toast />
        </View>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
