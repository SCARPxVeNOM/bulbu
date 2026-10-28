import { Redirect } from "expo-router";
import { useStore } from "@/lib/store";

export default function Index() {
  const { userId } = useStore();
  return <Redirect href={userId ? "/home" : "/welcome"} />;
}
