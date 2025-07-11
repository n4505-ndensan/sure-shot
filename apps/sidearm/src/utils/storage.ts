import { ApiToken, ServerInfo } from "@sureshot/api/src";


export interface StoredAuth {
  token: ApiToken;
  expiresAt: number;
}

/**
 * 認証情報をストレージに保存
 */
export async function saveAuthInfo(host: ServerInfo, token: ApiToken): Promise<void> {
  const authInfo: StoredAuth = {
    token,
    expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24時間後
  };
  
  await chrome.storage.local.set({
    'sureshot_auth': authInfo
  });
}

/**
 * 認証情報をストレージから取得
 */
export async function getAuthInfo(): Promise<StoredAuth | null> {
  try {
    const result = await chrome.storage.local.get('sureshot_auth');
    const authInfo = result.sureshot_auth as StoredAuth;
    
    if (!authInfo) {
      return null;
    }
    
    // 期限切れかチェック
    if (Date.now() > authInfo.expiresAt) {
      await clearAuthInfo();
      return null;
    }
    
    return authInfo;
  } catch (error) {
    console.error('Failed to get auth info:', error);
    return null;
  }
}

/**
 * 認証情報をクリア
 */
export async function clearAuthInfo(): Promise<void> {
  await chrome.storage.local.remove('sureshot_auth');
}

/**
 * 発見されたホスト一覧を保存
 */
export async function saveDiscoveredHosts(hosts: ServerInfo[]): Promise<void> {
  await chrome.storage.local.set({
    'sureshot_hosts': hosts,
    'sureshot_hosts_timestamp': Date.now()
  });
}

/**
 * 発見されたホスト一覧を取得
 */
export async function getDiscoveredHosts(): Promise<ServerInfo[]> {
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
