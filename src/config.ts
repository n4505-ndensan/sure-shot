// サーバー設定
export const CONFIG = {
  // 開発時はlocalhostまたは実際のIPアドレスを指定
  SERVER_URL: import.meta.env.VITE_SERVER_URL || "http://192.168.5.3:8000",
  INTERNAL_API_URL:
    import.meta.env.VITE_INTERNAL_API_URL || "http://127.0.0.1:8001",
};
