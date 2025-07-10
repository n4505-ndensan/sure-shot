import { AuthManager } from "../../auth/AuthManager";
import { ApiToken } from "../../types/ApiToken";

export async function login(apiToken: ApiToken): Promise<boolean> {
  try {
    const authManager = AuthManager.getInstance();

    const response = await fetch(
      `http://${apiToken.host.ip}:${apiToken.host.port}/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: apiToken.password,
          device_id: apiToken.deviceId,
        }),
      }
    );

    // HTTPステータスコードベースでエラーハンドリング
    if (response.status === 401) {
      console.error("Authentication failed: Invalid password");
      return false;
    }

    if (response.status === 403) {
      console.error("Authentication failed: Device not authorized");
      return false;
    }

    if (!response.ok) {
      console.error("Authentication failed with status:", response.status);
      return false;
    }

    const json = await response.json();
    console.log("Authentication successful:", json.message);

    // 認証成功、トークンを保存
    authManager.setToken(apiToken);
    return true;
  } catch (error) {
    console.error("Login failed:", error);
    return false;
  }
}

export function logout(): void {
  AuthManager.getInstance().clearToken();
}

export function isAuthenticated(): boolean {
  return AuthManager.getInstance().isAuthenticated();
}

export interface AuthStatus {
  authenticated: boolean;
  name?: string;
}

export function getAuthStatus(): AuthStatus {
  const manager = AuthManager.getInstance();
  if (manager.isAuthenticated()) {
    return {
      authenticated: true,
      name: AuthManager.getInstance().getToken()?.deviceId,
    };
  } else {
    return {
      authenticated: false,
    };
  }
}
