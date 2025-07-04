// 動的にサーバーのIPアドレスを取得する
export const getServerUrl = async (): Promise<string> => {
  try {
    // 内部APIから利用可能なサーバーを取得
    const response = await fetch("http://127.0.0.1:8001/ping_servers");
    if (response.ok) {
      const data = await response.json();
      const selfServer = data.servers.find((server: any) => server.is_self);
      if (selfServer) {
        return `http://${selfServer.ip}:${selfServer.port}`;
      }
    }
  } catch (error) {
    console.log("Failed to get server IP, using localhost:", error);
  }

  // フォールバック: localhostを使用
  return "http://localhost:8000";
};
