import { globalStore, setGlobalStore } from "../store/GlobalStore";

export async function updateServerList(silent: boolean = false) {
  if (!silent) setGlobalStore("servers", undefined);

  // リトライ機能付きでサーバーリストを取得
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`http://localhost:8000/ping_servers`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // タイムアウトを10秒に設定
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      console.log(`Servers updated (attempt ${attempt}):`, data);
      setGlobalStore("servers", [...data.servers]);
      return globalStore.servers;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Server list update attempt ${attempt} failed:`, error);

      // 最後の試行でなければ、少し待ってからリトライ
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // 1秒, 2秒, 3秒と間隔を空ける
      }
    }
  }

  // 全ての試行が失敗した場合
  console.error("Failed to fetch server list after all retries:", lastError);
  setGlobalStore("servers", []);
  return [];
}
