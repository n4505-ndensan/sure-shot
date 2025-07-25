import { AuthCredentials, AuthManager, AuthStatus, getAuthStatus, HostInfo } from '@sureshot/api';

interface ChromePersistedAuthData {
  token: string;
  authStatus: AuthStatus;
}

/**
 * ブラウザ拡張機能用のAuthManager
 * chrome.storage.localを使用してデータを永続化
 */
export class ChromeAuthManager {
  private static instance: ChromeAuthManager;
  private token: string | null = null;
  private authStatus: AuthStatus | null = null;
  private readonly STORAGE_KEY = 'sureshot_auth';
  private initialized = false;
  private suppressNotifications = false; // 通知を抑制するフラグ

  private constructor() {
    // 非同期初期化は明示的に行う
  }

  static getInstance(): ChromeAuthManager {
    if (!ChromeAuthManager.instance) {
      ChromeAuthManager.instance = new ChromeAuthManager();
    }
    return ChromeAuthManager.instance;
  }

  /**
   * 初期化（必要に応じて呼び出し）
   */
  async initialize(): Promise<void> {
    if (!this.initialized) {
      await this.loadFromStorage();
      this.initialized = true;
    }
  }

  async setToken(token: string, suppressNotifications: boolean = false): Promise<void> {
    this.token = token;
    await this.saveToStorage();

    // AuthManagerとも同期
    AuthManager.getInstance().setToken(token);

    // backgroundスクリプトに通知（抑制されていない場合のみ）
    if (!suppressNotifications && !this.suppressNotifications) {
      this.notifyAuthChange();
    }
  }
  getToken(): string | null {
    return this.token;
  }

  async clearToken(suppressNotifications: boolean = false): Promise<void> {
    this.token = null;
    await this.clearStorage();

    // AuthManagerとも同期
    AuthManager.getInstance().clearToken();

    // backgroundスクリプトに通知（抑制されていない場合のみ）
    if (!suppressNotifications && !this.suppressNotifications) {
      this.notifyAuthChange();
    }
  }
  async setAuthStatus(status: AuthStatus, suppressNotifications: boolean = false): Promise<void> {
    this.authStatus = status;
    await this.saveToStorage();

    console.log('try set status to authmanager: ', status);
    // AuthManagerとも同期
    AuthManager.getInstance().setAuthStatus(status);
    console.log('after set status to authmanager: ', AuthManager.getInstance().getAuthStatus());
    console.log('after set status to authmanager(imported authstatus method): ', getAuthStatus());

    // backgroundスクリプトに通知（抑制されていない場合のみ）
    if (!suppressNotifications && !this.suppressNotifications) {
      this.notifyAuthChange();
    }
  }

  getAuthStatus(): AuthStatus | null {
    return this.authStatus;
  }

  async clearAuthStatus(suppressNotifications: boolean = false): Promise<void> {
    this.authStatus = null;
    this.token = null;
    await this.clearStorage();

    // AuthManagerとも同期
    AuthManager.getInstance().clearAuthStatus();

    // backgroundスクリプトに通知（抑制されていない場合のみ）
    if (!suppressNotifications && !this.suppressNotifications) {
      this.notifyAuthChange();
    }
  }

  isAuthenticated(): boolean {
    return this.authStatus?.isAuthenticated === true && this.token !== null;
  }

  isServerReachable(): boolean {
    return this.authStatus?.isServerReachable === true;
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

  /**
   * トークンの有効性を検証
   */
  async validateToken(): Promise<boolean> {
    if (!this.token || !this.authStatus?.host) {
      return false;
    }

    try {
      const response = await fetch(`http://${this.authStatus.host.ip}:${this.authStatus.host.port}/auth/verify`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const updatedStatus = {
          ...this.authStatus,
          isServerReachable: true,
          isAuthenticated: true,
          lastError: undefined,
        };
        await this.setAuthStatus(updatedStatus);
        return true;
      } else {
        const updatedStatus = {
          ...this.authStatus,
          isServerReachable: true,
          isAuthenticated: false,
          lastError: {
            type: 'auth' as const,
            message: 'Token validation failed',
          },
        };
        await this.setAuthStatus(updatedStatus);
        return false;
      }
    } catch (error) {
      const updatedStatus = {
        ...this.authStatus,
        isServerReachable: false,
        isAuthenticated: false,
        lastError: {
          type: 'network' as const,
          message: error instanceof Error ? error.message : 'Network error',
        },
      };
      await this.setAuthStatus(updatedStatus);
      return false;
    }
  }

  /**
   * ログイン
   */
  async login(host: HostInfo, credentials: AuthCredentials): Promise<boolean> {
    try {
      const loginResponse = await fetch(`http://${host.ip}:${host.port}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: credentials.password,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        if (loginData.success && loginData.token) {
          await this.setToken(loginData.token, true); // suppressNotifications=true
          const successStatus = {
            isServerReachable: true,
            isAuthenticated: true,
            host,
            credentials,
            lastError: undefined,
          };
          await this.setAuthStatus(successStatus); // 最後に通知
          return true;
        }
      }

      // ログイン失敗
      const failedStatus = {
        isServerReachable: true,
        isAuthenticated: false,
        host,
        credentials,
        lastError: {
          type: 'auth' as const,
          message: 'Login failed',
        },
      };
      await this.setAuthStatus(failedStatus);
      return false;
    } catch (error) {
      // ネットワークエラー
      const errorStatus = {
        isServerReachable: false,
        isAuthenticated: false,
        host,
        credentials,
        lastError: {
          type: 'network' as const,
          message: error instanceof Error ? error.message : 'Network error',
        },
      };
      await this.setAuthStatus(errorStatus);
      return false;
    }
  }

  /**
   * chrome.storage.localからデータを読み込み
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      const data = result[this.STORAGE_KEY] as ChromePersistedAuthData;

      if (data) {
        this.token = data.token;
        this.authStatus = data.authStatus;

        // AuthManagerと同期
        const authManager = AuthManager.getInstance();
        if (this.token) {
          authManager.setToken(this.token);
        }
        if (this.authStatus) {
          // 起動時は認証状態をリセット（再確認が必要）
          const resetStatus = {
            ...this.authStatus,
            isAuthenticated: false,
            isServerReachable: false,
          };
          console.log('Resetting auth status to:', resetStatus);
          this.authStatus = resetStatus;
          authManager.setAuthStatus(resetStatus);
        }
      }
    } catch (error) {
      console.warn('Failed to load auth data from chrome.storage:', error);
      await this.clearStorage();
    }
  }

  /**
   * chrome.storage.localにデータを保存
   */
  private async saveToStorage(): Promise<void> {
    try {
      if (this.token && this.authStatus) {
        const data: ChromePersistedAuthData = {
          token: this.token,
          authStatus: this.authStatus,
        };
        await chrome.storage.local.set({
          [this.STORAGE_KEY]: data,
        });
      } else {
        await this.clearStorage();
      }
    } catch (error) {
      console.warn('Failed to save auth data to chrome.storage:', error);
    }
  }

  /**
   * chrome.storage.localからデータを削除
   */
  private async clearStorage(): Promise<void> {
    try {
      await chrome.storage.local.remove(this.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear auth data from chrome.storage:', error);
    }
  }

  /**
   * backgroundスクリプトに認証状態の変更を通知
   */
  private notifyAuthChange(): void {
    try {
      // background scriptに認証状態変更を通知
      chrome.runtime
        .sendMessage({
          type: 'AUTH_CHANGED',
          data: {
            token: this.token,
            authStatus: this.authStatus,
          },
        })
        .catch((error) => {
          // ポップアップから送信する場合、background scriptが受信できない場合があるが、
          // それは正常な動作なので警告レベルで出力
          console.warn('Failed to notify background script of auth change:', error);
        });
    } catch (error) {
      console.warn('Failed to send auth change notification:', error);
    }
  }
}
