import { HostConnectionInfo } from "../types/Types";
import { ServerInfo } from "../types/generated/api-types";

export interface AuthStatus {
  authenticated: boolean;
  host: ServerInfo | null;
  name?: string;
  password?: string;
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
  private readonly STORAGE_KEY = "sureshot_auth";
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
    this.clearStorage();
  }

  isAuthenticated(): boolean {
    // maybe check token validity from server.
    // await verifyToken(this.token)
    return this.token !== null;
  }

  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    return headers;
  }

  getBaseUrl(): string {
    if (!this.authStatus || !this.authStatus.host) {
      throw new Error("Not authenticated");
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
    if (typeof window === "undefined") return; // SSR対応

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored && this.persistAuth) {
        const data: PersistedAuthData = JSON.parse(stored);
        this.token = data.token;
        this.authStatus = data.authStatus;
      }
    } catch (error) {
      console.warn("Failed to load auth data from storage:", error);
      this.clearStorage();
    }
  }

  // ストレージへの保存
  private saveToStorage(): void {
    if (typeof window === "undefined" || !this.persistAuth) return;

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
      console.warn("Failed to save auth data to storage:", error);
    }
  }

  // ストレージのクリア
  private clearStorage(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to clear auth data from storage:", error);
    }
  }
}
