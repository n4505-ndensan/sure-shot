import { AuthManager, AuthStatus } from "../../auth/AuthManager";
import { HostConnectionInfo } from "../../types/Types";

export async function login(
  hostInfo: HostConnectionInfo,
  deviceId: string,
  password: string,
  debugFn?: (message: string) => void
): Promise<AuthStatus | undefined> {
  const log = debugFn || console.log;

  log(
    `login function called with: hostInfo=${JSON.stringify(
      hostInfo
    )}, deviceId=${deviceId}, passwordLength=${password?.length}`
  );

  try {
    const authManager = AuthManager.getInstance();
    const url = `http://${hostInfo.host.ip}:${hostInfo.host.port}/auth/login`;
    log(`Making fetch request to: ${url}`);

    const requestBody = {
      device_id: deviceId,
      password,
    };
    log(`Request body: ${JSON.stringify(requestBody)}`);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    log(
      `Fetch response received: status=${response.status}, statusText=${response.statusText}, ok=${response.ok}`
    );

    // HTTPステータスコードベースでエラーハンドリング
    if (response.status === 401) {
      log("Authentication failed: Invalid password");
      return undefined;
    }

    if (response.status === 403) {
      log("Authentication failed: Device not authorized");
      return undefined;
    }

    if (!response.ok) {
      log(`Authentication failed with status: ${response.status}`);
      return undefined;
    }

    const json = await response.json();
    log(`Response JSON: ${JSON.stringify(json)}`);

    // 認証成功、トークンを保存
    authManager.setToken(json.token);
    log(`Token saved: ${json.token}`);
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
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Login failed: ${errorMsg}`);
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
