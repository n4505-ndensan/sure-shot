import { getAuthStatus } from '@sureshot/api/src';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { createSignal, onMount, Show } from 'solid-js';
import { globalStore } from '~/store/GlobalStore';
import '~/styles/title_bar_region.css';
import { useAuthRedirect } from '~/utils/useAuthRedirect';
import HomeTitleBarContent from './HomeTitleBarContent';

export default function TitleBar() {
  const [isMaximizable, setIsMaximizable] = createSignal(false);
  const [isMinimizable, setIsMinimizable] = createSignal(false);
  const [isClosable, setIsClosable] = createSignal(false);
  const [isMaximized, setMaximized] = createSignal(false);
  const [title, setTitle] = createSignal('');

  const { lastAuthStatus } = useAuthRedirect();

  onMount(async () => {
    const window = getCurrentWindow();
    setIsMaximizable(await window.isMaximizable());
    setIsMinimizable(await window.isMinimizable());
    setIsClosable(await window.isClosable());
    setTitle(await window.title());
  });

  getCurrentWindow().onResized(async (handler) => {
    setMaximized(await getCurrentWindow().isMaximized());
  });

  return (
    <header
      style={{
        width: '100%',
        padding: '0 16px',
        'box-sizing': 'border-box',
      }}
    >
      <nav
        style={{
          display: 'flex',
          'flex-direction': 'row',
          width: '100%',
          height: '48px',
          'align-items': 'center',
        }}
        data-tauri-drag-region
      >
        <img src={'icon.png'} width={16} height={16} />

        <div
          style={{
            display: 'flex',
            'flex-direction': 'row',
            height: '100%',
            'align-items': 'center',
            gap: '12px',
            'flex-grow': 1,
            'margin-left': '12px',
          }}
        >
          <Show when={location.pathname.startsWith('/home')}>
            <p style={{ 'font-weight': 'bold', 'text-align': 'start' }}>{getAuthStatus()?.credentials?.name}</p>
            <p style={{ opacity: 0.5, 'text-align': 'end' }}>({globalStore.localIp})</p>
          </Show>
          <Show when={location.pathname.startsWith('/setup')}>
            <p style={{ 'font-weight': 'bold' }}>setup</p>
          </Show>
        </div>

        <div
          style={{
            display: 'flex',
            'flex-direction': 'row',
            height: '100%',
            'align-items': 'center',
            gap: '12px',
          }}
          data-tauri-drag-region-exclude
        >
          <HomeTitleBarContent data-tauri-drag-region-exclude />
          <Show when={isMinimizable()}>
            <div
              onClick={async (e) => {
                e.preventDefault();
                await getCurrentWindow().minimize();
              }}
              style={{
                width: '12px',
                height: '12px',
                cursor: 'pointer',
              }}
              data-tauri-drag-region-exclude
            >
              <img
                src={'/icons/title_bar/minimize_2.png'}
                width={12}
                height={12}
                style={{
                  width: '12px',
                  height: '12px',
                }}
                data-tauri-drag-region-exclude
              />
            </div>
          </Show>

          <Show when={isMaximizable()}>
            <div
              onClick={async (e) => {
                e.preventDefault();
                if (!isMaximized()) await getCurrentWindow().maximize();
                else await getCurrentWindow().unmaximize();
              }}
              style={{
                width: '12px',
                height: '12px',
                cursor: 'pointer',
              }}
              data-tauri-drag-region-exclude
            >
              <img
                src={isMaximized() ? '/icons/title_bar/quit_maximize_2.png' : '/icons/title_bar/maximize_2.png'}
                width={12}
                height={12}
                style={{
                  width: '12px',
                  height: '12px',
                }}
                data-tauri-drag-region-exclude
              />
            </div>
          </Show>

          <Show when={isClosable()}>
            <div
              onClick={async (e) => {
                e.preventDefault();
                await getCurrentWindow().close();
              }}
              style={{
                width: '12px',
                height: '12px',
                cursor: 'pointer',
              }}
              data-tauri-drag-region-exclude
            >
              <img
                src={'/icons/title_bar/close_2.png'}
                width={12}
                height={12}
                style={{
                  width: '12px',
                  height: '12px',
                }}
                data-tauri-drag-region-exclude
              />
            </div>
          </Show>
        </div>
      </nav>
    </header>
  );
}
