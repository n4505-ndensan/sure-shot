import { useLocation, useNavigate } from '@solidjs/router';
import { AuthManager, getAuthStatus } from '@sureshot/api/src';
import { AuthStatus } from '@sureshot/api/src/auth/AuthManager';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { platform } from '@tauri-apps/plugin-os';
import { createSignal, onCleanup } from 'solid-js';

let validateInterval: NodeJS.Timeout | undefined;

// preserve: 残っていたらログイン試行、残っていない場合はそのまま (例：/login 途中でサーバーが復活したらhomeに行く、 /home ログイン失敗時もhome画面は保持)
// last-available: 残っていたらOK、残っていない場合はログイン画面へ (例：/setup 情報が残っていたらとりあえずhomeに行く)
// force-relogin: 残っていたらログイン試行、、残っていない場合はログイン画面へ (例：強制的にログイン...今のところ例なし)
type RedirectMode = 'preserve' | 'last-available' | 'force-relogin';

export const useAuthRedirect = (interval?: RedirectMode) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [lastAuthStatus, setLastAuthStatus] = createSignal<AuthStatus | null>(getAuthStatus());
  const [isMobile, setIsMobile] = createSignal<boolean>(false);

  // プラットフォーム検出
  const checkPlatform = async () => {
    const currentPlatform = await platform();
    setIsMobile(currentPlatform === 'android' || currentPlatform === 'ios');
  };

  // 初期化時にプラットフォームを確認
  checkPlatform();

  const redirectByAuthStatus = (authenticated: boolean) => {
    if (authenticated) {
      if (location.pathname === '/home') return;

      if (isMobile()) {
        // モバイル環境では同じウィンドウ内でページ遷移
        navigate('/home');
      } else {
        // デスクトップ環境では新しいウィンドウを作成
        const homeWindow = new WebviewWindow('home', {
          title: '',
          url: '/home',
          width: 800,
          height: 540,
          maximizable: true,
          minimizable: true,
          closable: true,
          resizable: true,
          decorations: false,
        });
        homeWindow.show();
        homeWindow.setFocus();
        homeWindow.once('tauri://created', () => {
          getCurrentWindow().close();
        });
      }
    } else {
      if (location.pathname === '/login') return;

      if (isMobile()) {
        // モバイル環境では同じウィンドウ内でページ遷移
        navigate('/login');
      } else {
        // デスクトップ環境では新しいウィンドウを作成
        const setupWindow = new WebviewWindow('login', {
          title: '',
          url: '/login',
          width: 400,
          height: 350,
          maximizable: false,
          minimizable: false,
          closable: true,
          resizable: false,
          decorations: false,
        });
        setupWindow.show();
        setupWindow.setFocus();
        setupWindow.once('tauri://created', () => {
          getCurrentWindow().close();
        });
      }
    }
  };

  const validateAuth = async (mode: RedirectMode) => {
    const authManager = AuthManager.getInstance();
    const status = getAuthStatus();

    if (status && status.host && status) {
      if (mode === 'last-available') {
        redirectByAuthStatus(true); // 残っていたらOK
      } else {
        // 保存されたホスト情報でトークンの有効性をチェック（トークンは再発行しない）
        const isStillAuthenticated = await authManager.tryAuthWithSavedHost();
        if (isStillAuthenticated) {
          redirectByAuthStatus(true);
        } else if (mode === 'force-relogin') {
          // 接続が失敗した場合のみ、ログイン画面へリダイレクト
          redirectByAuthStatus(false);
        }
      }
    } else {
      if (mode !== 'preserve') redirectByAuthStatus(false);
    }

    setLastAuthStatus(getAuthStatus());
  };

  const startValidateInterval = () => {
    if (validateInterval) {
      clearInterval(validateInterval);
    }
    validateInterval = setInterval(() => {
      console.log('Validating auth status...');
      validateAuth(interval || 'preserve');
    }, 3000);
  };

  const clearValidateInterval = () => {
    if (validateInterval) {
      clearInterval(validateInterval);
      validateInterval = undefined;
    }
  };

  if (interval) {
    startValidateInterval();
  }

  onCleanup(() => {
    clearValidateInterval();
  });

  return { validateAuth, lastAuthStatus, isMobile };
};
