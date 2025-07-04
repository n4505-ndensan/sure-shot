import { globalStore, setGlobalStore } from "../store/GlobalStore";

export async function updateServerList() {
  setGlobalStore("servers", undefined);

  const res = await fetch(`http://localhost:8001/ping_servers`);

  if (!res.ok) {
    console.error("Failed to fetch ports:", res.statusText);
    setGlobalStore("servers", []);
    return;
  }

  const data = await res.json();
  console.log("Servers updated:", data);
  setGlobalStore("servers", [...data.servers]);
  return globalStore.servers;
}
