import { HostInfo } from '../types/generated/api-types';

export interface AuthCredentials {
  name: string;
  password: string;
}

export interface AuthError {
  type: 'network' | 'auth' | 'unknown';
  message: string;
}

export interface AuthStatus {
  // 接続状態
  isServerReachable: boolean;

  // 認証状態
  isAuthenticated: boolean;

  // 保存されている情報
  host: HostInfo | null;
  credentials?: AuthCredentials;

  // 最後のエラー
  lastError?: AuthError;
}

interface PersistedAuthData {
  token: string;
  authStatus: AuthStatus;
}

export class AuthManager {
  private static instance: AuthManager;
  // private apiToken: ApiToken | null = null; DELETE ApiToken!
  private token: string | null = null;
  private authStatus: AuthStatus | null = null;
  private readonly STORAGE_KEY = 'sureshot_auth';
  private persistAuth: boolean = true; // デフォルトでは永続化有効

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  setToken(token: string): void {
    this.token = token;
    this.saveToStorage();
  }

  getToken(): string | null {
    return this.token;
  }

  clearToken(): void {
    this.token = null;
    this.clearStorage();
  }

  setAuthStatus(status: AuthStatus): void {
    this.authStatus = status;
    this.saveToStorage();
  }

  getAuthStatus(): AuthStatus | null {
    return this.authStatus;
  }

  clearAuthStatus(): void {
    this.authStatus = null;
    this.token = null;
    this.clearStorage();
  }

  isAuthenticated(): boolean {
    return this.authStatus?.isAuthenticated === true && this.token !== null;
  }

  isServerReachable(): boolean {
    return this.authStatus?.isServerReachable === true;
  }

  getLastError(): AuthError | undefined {
    return this.authStatus?.lastError;
  }

  // 新しいログインメソッド - 認証情報も保存
  async login(host: HostInfo, credentials: AuthCredentials): Promise<boolean> {
    try {
      const loginResponse = await fetch(`http://${host.ip}:${host.port}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: credentials.name,
          password: credentials.password,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        if (loginData.success && loginData.token) {
          this.setToken(loginData.token);
          this.setAuthStatus({
            isServerReachable: true,
            isAuthenticated: true,
            host,
            credentials,
            lastError: undefined,
          });
          return true;
        }
      }

      // ログイン失敗
      this.setAuthStatus({
        isServerReachable: true,
        isAuthenticated: false,
        host,
        credentials,
        lastError: {
          type: 'auth',
          message: 'Login failed',
        },
      });
      return false;
    } catch (error) {
      // ネットワークエラー
      this.setAuthStatus({
        isServerReachable: false,
        isAuthenticated: false,
        host,
        credentials,
        lastError: {
          type: 'network',
          message: error instanceof Error ? error.message : 'Network error',
        },
      });
      return false;
    }
  }

  // 保存されたホスト情報を使って認証を試行
  async tryAuthWithSavedHost(): Promise<boolean> {
    if (!this.authStatus || !this.authStatus.host) {
      return false;
    }

    try {
      // 1. まずホストが生きているか確認
      const pingResponse = await fetch(`http://${this.authStatus.host.ip}:${this.authStatus.host.port}/ping`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000), // 3秒でタイムアウト
      });

      if (!pingResponse.ok) {
        // ホストが応答しない場合
        this.setAuthStatus({
          ...this.authStatus,
          isServerReachable: false,
          isAuthenticated: false,
          lastError: {
            type: 'network',
            message: 'Server is not reachable',
          },
        });
        return false;
      }

      // 2. ホストが生きている場合、トークンの有効性をチェック
      if (this.token) {
        const verifyResponse = await fetch(`http://${this.authStatus.host.ip}:${this.authStatus.host.port}/auth/verify`, {
          method: 'GET',
          headers: this.getAuthHeaders(),
          signal: AbortSignal.timeout(3000), // 3秒でタイムアウト
        });

        if (verifyResponse.ok) {
          // トークンが有効な場合
          this.setAuthStatus({
            ...this.authStatus,
            isServerReachable: true,
            isAuthenticated: true,
            lastError: undefined,
          });
          return true;
        }
      }

      // 3. トークンが無効または存在しない場合、自動再ログインを試行
      if (this.authStatus.credentials) {
        console.log('Token invalid or missing, attempting automatic re-login...');

        const loginResponse = await fetch(`http://${this.authStatus.host.ip}:${this.authStatus.host.port}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_id: this.authStatus.credentials.name,
            password: this.authStatus.credentials.password,
          }),
          signal: AbortSignal.timeout(5000),
        });

        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          if (loginData.success && loginData.token) {
            this.setToken(loginData.token);
            this.setAuthStatus({
              ...this.authStatus,
              isServerReachable: true,
              isAuthenticated: true,
              lastError: undefined,
            });
            console.log('Automatic re-login successful');
            return true;
          }
        }
      }

      // 4. 再ログインも失敗した場合
      this.setAuthStatus({
        ...this.authStatus,
        isServerReachable: true,
        isAuthenticated: false,
        lastError: {
          type: 'auth',
          message: 'Authentication failed',
        },
      });
      return false;
    } catch (error) {
      // 接続エラーの場合
      console.warn('Failed to verify authentication with saved host:', error);
      this.setAuthStatus({
        ...this.authStatus,
        isServerReachable: false,
        isAuthenticated: false,
        lastError: {
          type: 'network',
          message: error instanceof Error ? error.message : 'Network error',
        },
      });
      return false;
    }
  }

  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  getBaseUrl(): string {
    if (!this.authStatus || !this.authStatus.host) {
      throw new Error('Not authenticated');
    }
    return `http://${this.authStatus.host.ip}:${this.authStatus.host.port}`;
  }

  // 永続化設定
  setPersistAuth(persist: boolean): void {
    this.persistAuth = persist;
    if (!persist) {
      this.clearStorage();
    }
  }

  getPersistAuth(): boolean {
    return this.persistAuth;
  }

  // ストレージからの読み込み
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return; // SSR対応

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored && this.persistAuth) {
        const data: PersistedAuthData = JSON.parse(stored);
        this.token = data.token;
        console.log(data);
        // 古い形式のデータを新しい形式に移行
        if (data.authStatus) {
          // 古い形式かどうかチェック
          const oldStatus = data.authStatus as any;
          if ('authenticated' in oldStatus && !('isAuthenticated' in oldStatus)) {
            // 古い形式を新しい形式に変換
            this.authStatus = {
              isServerReachable: false, // 初期状態では不明
              isAuthenticated: false, // 起動時は再確認が必要
              host: oldStatus.host,
              credentials:
                oldStatus.name && oldStatus.password
                  ? {
                      name: oldStatus.name,
                      password: oldStatus.password,
                    }
                  : undefined,
            } as AuthStatus;
          } else {
            // 新しい形式
            this.authStatus = data.authStatus as AuthStatus;
            // 起動時は認証状態をリセット（再確認が必要）
            this.authStatus.isAuthenticated = false;
            this.authStatus.isServerReachable = false;
          }
        }
      }

      this.saveToStorage();
    } catch (error) {
      console.warn('Failed to load auth data from storage:', error);
      this.clearStorage();
    }
  }

  // ストレージへの保存
  private saveToStorage(): void {
    if (typeof window === 'undefined' || !this.persistAuth) return;

    try {
      if (this.token && this.authStatus) {
        const data: PersistedAuthData = {
          token: this.token,
          authStatus: this.authStatus,
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      } else {
        this.clearStorage();
      }
    } catch (error) {
      console.warn('Failed to save auth data to storage:', error);
    }
  }

  // ストレージのクリア
  private clearStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear auth data from storage:', error);
    }
  }
}
