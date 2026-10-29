// The Dim raid warning as a phone notification: "A Dim raid is coming at 11 PM", half an hour before it strikes.
// Tapping it opens Defend. Local notifications only (no server push); on web there's nothing to schedule.
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { RaidView } from "@bulbu/api";

const KIND = "dim-raid";
const LEAD_MS = 30 * 60_000;
let channelReady = false, asked = false, scheduledFor = "";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

/** Schedule (or reschedule) the warning for this raid; cancel it once the raid's held off or over. */
export async function syncRaidAlert(raid: RaidView | null) {
  if (Platform.OS === "web") return;
  const key = raid ? `${raid.id}|${raid.at}|${raid.state}|${raid.line}` : "none";
  if (key === scheduledFor) return;
  scheduledFor = key;
  try {
    // only ever one raid warning waiting
    for (const n of await Notifications.getAllScheduledNotificationsAsync())
      if (n.content.data?.kind === KIND) await Notifications.cancelScheduledNotificationAsync(n.identifier);
    if (!raid || raid.state === "defended" || raid.state === "passed") return;
    const fire = new Date(raid.at).getTime() - LEAD_MS;
    if (fire <= Date.now() + 5_000) return;
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && !asked && perm.canAskAgain) { asked = true; perm = await Notifications.requestPermissionsAsync(); }
    if (!perm.granted) return;
    if (Platform.OS === "android" && !channelReady) {
      await Notifications.setNotificationChannelAsync("raids", { name: "Dim raids", importance: Notifications.AndroidImportance.HIGH });
      channelReady = true;
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `A Dim raid is coming at ${raid.label}`,
        body: `${raid.line.startsWith("A Dim raid") ? `It's heading for the ${raid.buildingName}.` : raid.line} 25 minutes of focus holds it off.`,
        data: { kind: KIND, url: `/focus?raid=${raid.id}` },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fire, channelId: "raids" },
    });
  } catch (e) { console.warn("raid alert:", (e as Error).message); scheduledFor = ""; }
}

/** Tapping the warning opens Defend. Returns an unsubscribe. */
export function onRaidAlertTap(open: (url: string) => void) {
  if (Platform.OS === "web") return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener(r => {
    const d = r.notification.request.content.data as { kind?: string; url?: string } | undefined;
    if (d?.kind === KIND && d.url) open(d.url);
  });
  return () => sub.remove();
}
