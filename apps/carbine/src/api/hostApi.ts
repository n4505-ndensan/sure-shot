import { invoke } from "@tauri-apps/api/core";

export interface ServerInfo {
  ip: string;
  port: number;
  status: string;
  message: string;
  name: string;
  is_self: boolean;
}

/**
 * Get host information or connect to a new host automatically
 * This function handles both getting current host and discovering new hosts
 */
export async function getHostOrConnect(): Promise<ServerInfo | null> {
  try {
    // First try to get current host
    let host: ServerInfo | null = null;
    try {
      host = await invoke("get_current_host");
    } catch (error) {
      console.log("No current host found, attempting discovery...");
    }

    // If no current host, try to discover and connect to one
    if (!host) {
      await invoke("refresh_host");
      host = await invoke("get_current_host");
    }

    return host;
  } catch (error) {
    console.error("Failed to get or connect to host:", error);
    throw error;
  }
}

/**
 * Find all hosts in the network (manual discovery)
 */
export async function findHosts(): Promise<ServerInfo[]> {
  try {
    return await invoke("find_host");
  } catch (error) {
    console.error("Failed to find hosts:", error);
    throw error;
  }
}
