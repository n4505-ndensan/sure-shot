import { AuthManager, AuthStatus } from '../../auth/AuthManager';
import { HostInfo } from '../../types/generated/api-types';

export async function login(hostInfo: HostInfo, password: string, debugFn?: (message: string) => void): Promise<AuthStatus> {
  const log = debugFn || console.log;
  const authManager = AuthManager.getInstance();

  const failedStatus: AuthStatus = {
    isServerReachable: false,
    isAuthenticated: false,
    host: hostInfo,
    credentials: {
      password,
    },
  };

  log(`login function called with: hostInfo=${JSON.stringify(hostInfo)},  passwordLength=${password?.length}`);

  try {
    const url = `http://${hostInfo.ip}:${hostInfo.port}/auth/login`;
    // log(`Making fetch request to: ${url}`);

    const requestBody = {
      password,
    };
    // log(`Request body: ${JSON.stringify(requestBody)}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    // log(`Fetch response received: status=${response.status}, statusText=${response.statusText}, ok=${response.ok}`);

    // HTTPステータスコードベースでエラーハンドリング
    if (response.status === 401) {
      log('Authentication failed: Invalid password');
      authManager.setAuthStatus({
        ...failedStatus,
        lastError: {
          type: 'auth',
          message: 'Invalid password',
        },
      });
      return failedStatus;
    }

    if (!response.ok) {
      log(`Authentication failed with status: ${response.status}`);
      authManager.setAuthStatus({
        ...failedStatus,
        lastError: {
          type: 'auth',
          message: `Authentication failed with status: ${response.status}`,
        },
      });
      return failedStatus;
    }

    const json = await response.json();
    log(`Response JSON: ${JSON.stringify(json)}`);

    // 認証成功、トークンを保存
    authManager.setToken(json.token);
    log(`Token saved: ${json.token}`);
    const authStatus: AuthStatus = {
      isServerReachable: true,
      isAuthenticated: true,
      host: hostInfo,
      credentials: {
        password,
      },
    };
    // ホスト情報も保存
    authManager.setAuthStatus(authStatus);
    return authStatus;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Login failed: ${errorMsg}`);
    authManager.setAuthStatus(failedStatus);
    return failedStatus;
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
