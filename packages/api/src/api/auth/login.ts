import { AuthManager, AuthStatus } from "../../auth/AuthManager";
import { HostConnectionInfo } from "../../types/Types";

export async function login(
  hostInfo: HostConnectionInfo,
  deviceId: string,
  password: string
): Promise<AuthStatus | undefined> {
  try {
    const authManager = AuthManager.getInstance();

    const response = await fetch(
      `http://${hostInfo.host.ip}:${hostInfo.host.port}/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: deviceId,
          password,
        }),
      }
    );

    // HTTPステータスコードベースでエラーハンドリング
    if (response.status === 401) {
      console.error("Authentication failed: Invalid password");
      return undefined;
    }

    if (response.status === 403) {
      console.error("Authentication failed: Device not authorized");
      return undefined;
    }

    if (!response.ok) {
      console.error("Authentication failed with status:", response.status);
      return undefined;
    }

    const json = await response.json();

    // 認証成功、トークンを保存
    authManager.setToken(json.token);
    console.log(json.token);
    const authStatus: AuthStatus = {
      authenticated: true,
      host: hostInfo.host,
      name: deviceId,
      password, // パスワードも保存する場合
    };
    // ホスト情報も保存
    authManager.setAuthStatus(authStatus);
    return authStatus;
  } catch (error) {
    console.error("Login failed:", error);
    return undefined;
  }
}

export function logout(): void {
  const authManager = AuthManager.getInstance();
  authManager.clearToken();
  authManager.clearAuthStatus();
}

export function getAuthStatus(): AuthStatus | null {
  return AuthManager.getInstance().getAuthStatus();
}
