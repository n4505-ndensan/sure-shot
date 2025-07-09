import { invoke } from "@tauri-apps/api/core";
import { globalStore, setGlobalStore } from "~/store/GlobalStore";

/**
 * Get the local IP address of the current device
 * @returns Promise<string> - The local IP address
 */
export async function getLocalIp(): Promise<string> {
  try {
    const ip: string = await invoke("get_local_ip");
    if (globalStore.localIp !== ip) {
      setGlobalStore({ localIp: ip });
    }
    return ip;
  } catch (error) {
    console.error("Failed to get local IP:", error);
    throw error;
  }
}
