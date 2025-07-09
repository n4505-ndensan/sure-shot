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
 * Get the currently saved host information
 */
export async function getCurrentHost(): Promise<ServerInfo | null> {
  try {
    return await invoke("get_current_host");
  } catch (error) {
    console.error("Failed to get current host:", error);
    throw error;
  }
}

/**
 * Refresh host discovery
 */
export async function refreshHost(): Promise<void> {
  try {
    await invoke("refresh_host");
  } catch (error) {
    console.error("Failed to refresh host:", error);
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
