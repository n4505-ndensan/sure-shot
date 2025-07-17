import { useLocation } from '@solidjs/router';
import { getAuthStatus, login } from '@sureshot/api/src';
import { AuthStatus } from '@sureshot/api/src/auth/AuthManager';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { createSignal, onCleanup } from 'solid-js';

let validateInterval: NodeJS.Timeout | undefined;

// preserve: 残っていたらログイン試行、残っていない場合はそのまま (例：/login 途中でサーバーが復活したらhomeに行く、 /home ログイン失敗時もhome画面は保持)
// last-available: 残っていたらOK、残っていない場合はログイン画面へ (例：/setup 情報が残っていたらとりあえずhomeに行く)
// force-relogin: 残っていたらログイン試行、、残っていない場合はログイン画面へ (例：強制的にログイン...今のところ例なし)
type RedirectMode = 'preserve' | 'last-available' | 'force-relogin';

export const useAuthRedirect = (interval?: RedirectMode) => {
  const location = useLocation();

  const [lastAuthStatus, setLastAuthStatus] = createSignal<AuthStatus | null>(getAuthStatus());

  const redirectByAuthStatus = (authenticated: boolean) => {
    if (authenticated) {
      if (location.pathname === '/home') return;
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
      homeWindow.once('tauri://created', () => {
        getCurrentWindow().close();
      });
    } else {
      if (location.pathname === '/login') return;
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
      setupWindow.once('tauri://created', () => {
        getCurrentWindow().close();
      });
    }
  };

  const validateAuth = async (mode: RedirectMode) => {
    const status = getAuthStatus();
    if (status && status.host && status.name && status.password) {
      if (mode === 'last-available') {
        redirectByAuthStatus(true); // 残っていたらOK
      } else {
        let loginResultStatus = await login(status.host, status.name, status.password);
        if (loginResultStatus.authenticated) {
          redirectByAuthStatus(loginResultStatus.authenticated);
        } else if (mode === 'force-relogin') {
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

  return { validateAuth, lastAuthStatus };
};
