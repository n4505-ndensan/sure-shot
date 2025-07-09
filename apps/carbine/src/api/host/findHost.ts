import { invoke } from '@tauri-apps/api/core';

export interface ServerInfo {
  ip: string;
  port: number;
  status: string;
  message: string;
  name: string;
  is_self: boolean;
}

/**
 * Get the currently stored host information
 * @returns Promise<ServerInfo | null> - Current host information or null if not found
 */
export async function getCurrentHost(): Promise<ServerInfo | null> {
  try {
    const host: ServerInfo | null = await invoke('get_current_host');
    return host;
  } catch (error) {
    console.error('Failed to get current host:', error);
    throw error;
  }
}

/**
 * Refresh the host by searching for a new one
 * @returns Promise<void>
 */
export async function refreshHost(): Promise<void> {
  try {
    await invoke('refresh_host');
  } catch (error) {
    console.error('Failed to refresh host:', error);
    throw error;
  }
}

/**
 * Search for available servers in the local network
 * @returns Promise<ServerInfo[]> - Array of found server information
 */
export async function findHost(): Promise<ServerInfo[]> {
  try {
    const servers: ServerInfo[] = await invoke('find_host');
    return servers;
  } catch (error) {
    console.error('Failed to find hosts:', error);
    throw error;
  }
}
