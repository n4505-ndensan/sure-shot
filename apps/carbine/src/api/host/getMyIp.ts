import { ServerInfo } from "../../types/generated/api-types";

/**
 * 自分のIPアドレスを取得する
 * @returns Promise<string | null> - 自分のIPアドレスまたはnull
 */
export async function getMyIp(): Promise<string | null> {
  try {
    const response = await fetch("http://localhost:8000/ping_servers");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const selfServer = data.servers.find(
      (server: ServerInfo) => server.is_self
    );

    if (selfServer) {
      return selfServer.ip;
    }

    return null;
  } catch (error) {
    console.error("Failed to get my IP:", error);
    return null;
  }
}
