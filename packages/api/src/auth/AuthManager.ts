import { ApiToken } from "../types/ApiToken";

export class AuthManager {
  private static instance: AuthManager;
  private apiToken: ApiToken | null = null;

  private constructor() {}

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  setToken(token: ApiToken): void {
    this.apiToken = token;
  }

  getToken(): ApiToken | null {
    return this.apiToken;
  }

  clearToken(): void {
    this.apiToken = null;
  }

  isAuthenticated(): boolean {
    return this.apiToken !== null;
  }

  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiToken?.password) {
      headers["Authorization"] = `Bearer ${this.apiToken.password}`;
    }

    return headers;
  }

  getBaseUrl(): string {
    if (!this.apiToken) {
      throw new Error("Not authenticated");
    }
    return `http://${this.apiToken.host.ip}:${this.apiToken.host.port}`;
  }
}
