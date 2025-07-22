import { HostInfo } from '@sureshot/api/src';
import { AuthStatus } from '@sureshot/api/src/auth/AuthManager';
import { ChromeAuthManager } from './ChromeAuthManager';

export interface StoredAuth {
  token: string;
  authStatus: AuthStatus;
}

/**
 * 認証情報をストレージに保存
 * @deprecated ChromeAuthManagerを直接使用してください
 */
export async function saveAuthInfo(authStatus: AuthStatus, token: string): Promise<void> {
  const authManager = ChromeAuthManager.getInstance();
  await authManager.setToken(token);
  await authManager.setAuthStatus(authStatus);
}

/**
 * 認証情報をストレージから取得
 * @deprecated ChromeAuthManagerを直接使用してください
 */
export async function getAuthInfo(): Promise<StoredAuth | null> {
  const authManager = ChromeAuthManager.getInstance();
  const token = authManager.getToken();
  const authStatus = authManager.getAuthStatus();

  if (token && authStatus) {
    return { token, authStatus };
  }
  return null;
}

/**
 * 認証情報をクリア
 * @deprecated ChromeAuthManagerを直接使用してください
 */
export async function clearAuthInfo(): Promise<void> {
  const authManager = ChromeAuthManager.getInstance();
  await authManager.clearAuthStatus();
}

/**
 * 発見されたホスト一覧を保存
 */
export async function saveDiscoveredHosts(hosts: HostInfo[]): Promise<void> {
  await chrome.storage.local.set({
    sureshot_hosts: hosts,
    sureshot_hosts_timestamp: Date.now(),
  });
}

/**
 * 発見されたホスト一覧を取得
 */
export async function getDiscoveredHosts(): Promise<HostInfo[]> {
  try {
    const result = await chrome.storage.local.get(['sureshot_hosts', 'sureshot_hosts_timestamp']);

    // 30分以内のキャッシュのみ有効
    const timestamp = result.sureshot_hosts_timestamp || 0;
    const maxAge = 30 * 60 * 1000; // 30分

    if (Date.now() - timestamp > maxAge) {
      return [];
    }

    return result.sureshot_hosts || [];
  } catch (error) {
    console.error('Failed to get discovered hosts:', error);
    return [];
  }
}
