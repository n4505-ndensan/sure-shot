import { invoke } from "@tauri-apps/api/core";

/**
 * Get the local IP address of the current device
 * @returns Promise<string> - The local IP address
 */
export async function getDeviceName(): Promise<string> {
  try {
    const deviceName: string = await invoke("get_device_name");
    return deviceName;
  } catch (error) {
    console.error("Failed to get device name:", error);
    throw error;
  }
}
