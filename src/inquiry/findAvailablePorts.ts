import { globalStore, setGlobalStore } from "../store/GlobalStore";

export async function updateServers() {
  console.log("Checking ports...");
  const address = window.location.hostname || "localhost";

  const res = await fetch(`http://${address}:8000/ping_servers`);

  if (!res.ok) {
    console.error("Failed to fetch ports:", res.statusText);
    setGlobalStore("ports", {});
    return;
  }

  const data = await res.json();
  console.log("Ports updated:", data);
  setGlobalStore("ports", data.servers || []);
  return globalStore.ports;
}
