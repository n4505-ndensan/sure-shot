import { HostInfo } from "@sureshot/api/src";
import { invoke } from "@tauri-apps/api/core";

/**
 * Find all hosts in the network (manual discovery)
 */
export async function findHosts(): Promise<HostInfo[]> {
  try {
    return await invoke("find_host");
  } catch (error) {
    console.error("Failed to find hosts:", error);
    throw error;
  }
}
