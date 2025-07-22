import { getAuthStatus, sendMessage } from '@sureshot/api';
import { ChromeAuthManager } from '../src/utils/ChromeAuthManager';

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });

  // ChromeAuthManagerを初期化
  const initializeAuth = async () => {
    try {
      const authManager = ChromeAuthManager.getInstance();
      await authManager.initialize(); // 認証状態をリセットしない
      console.log('Background: ChromeAuthManager initialized');
    } catch (error) {
      console.error('Background: Failed to initialize ChromeAuthManager:', error);
    }
  };

  // 初期化実行
  initializeAuth();

  // ポップアップからの認証状態変更通知を受信
  browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === 'AUTH_CHANGED') {
      console.log('Background: Received auth change notification:', message.data);

      try {
        const authManager = ChromeAuthManager.getInstance();

        if (message.data.token && message.data.authStatus) {
          // 認証情報を更新（通知を抑制）
          await authManager.setToken(message.data.token, true);
          await authManager.setAuthStatus(message.data.authStatus, true);
          console.log('Background: Auth status updated');

          // リンク用の右クリックメニューを作成
          browser.contextMenus.create({
            id: 'send-link',
            title: 'Shot This Link!',
            contexts: ['link'],
          });

          browser.contextMenus.create({
            id: 'send-page',
            title: 'Shot This Page!',
            contexts: ['page', 'frame', 'image'],
          });
        } else {
          // 認証情報をクリア（通知を抑制）
          await authManager.clearAuthStatus(true);
          console.log('Background: Auth status cleared');

          browser.contextMenus.removeAll(); // 右クリックメニューを削除
        }
      } catch (error) {
        console.error('Background: Failed to update auth status:', error);
      }
    }
  });

  browser.runtime.onInstalled.addListener(async () => {
    const authManager = ChromeAuthManager.getInstance();

    if (authManager.isAuthenticated()) {
      console.log('Background: Auth status updated');

      // リンク用の右クリックメニューを作成
      browser.contextMenus.create({
        id: 'send-link',
        title: 'Shot This Link!',
        contexts: ['link'],
      });

      browser.contextMenus.create({
        id: 'send-page',
        title: 'Shot This Page!',
        contexts: ['page', 'frame', 'image'],
      });
    } else {
      // 認証情報をクリア（通知を抑制）
      await authManager.clearAuthStatus(true);
      console.log('Background: Auth status cleared');

      browser.contextMenus.removeAll(); // 右クリックメニューを削除
    }
  });

  // 拡張機能がインストールされた時の処理
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.removeAll(); // 右クリックメニューを削除
  });

  // 右クリックメニューのクリック処理
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    console.log('Context menu clicked! Info:', info);
    console.log('Menu item ID:', info.menuItemId);
    console.log('Link URL:', info.linkUrl);

    if (info.menuItemId === 'send-link') {
      const linkUrl = info.linkUrl;
      if (linkUrl) {
        console.log('🔗 Sending link:', linkUrl);
        const result = await sendURL(linkUrl);

        if (result.success) {
          console.log('✅ Link sent successfully!', result);
        } else {
          console.error('❌ Failed to send link:', result.message);
        }
      } else {
        console.error('❌ No link URL found in context menu info');
      }
    }

    if (info.menuItemId === 'send-page') {
      const pageUrl = info.pageUrl;
      if (pageUrl) {
        console.log('🔗 Sending page:', pageUrl);
        const result = await sendURL(pageUrl);

        if (result.success) {
          console.log('✅ Page sent successfully!', result);
        } else {
          console.error('❌ Failed to send page:', result.message);
        }
      } else {
        console.error('❌ No page URL found in context menu info');
      }
    }
  });
});

// メッセージ送信用の関数
async function sendURL(url: string, message: string = '') {
  try {
    const status = getAuthStatus();
    const result = await sendMessage(status?.credentials?.name + '-sidearm', 'sidearm', message || `リンクを共有: ${url}`, 'text', []);
    return result;
  } catch (error) {
    alert('Disconnected from server. Please check your connection.');
    console.error('❌ Failed to send message:', error);
    return {
      success: false,
      message: `Failed to send message: ${error}`,
      timestamp: new Date().toISOString(),
    };
  }
}
