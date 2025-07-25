import { logout } from '@sureshot/api';
import { Component, createSignal, onCleanup, onMount, Show } from 'solid-js';
import Light from '../common/Light';

import '@styles/components/connection_status.css';
import { useAuthRedirect } from '~/utils/useAuthRedirect';

export const ConnectionStatus: Component = () => {
  let menuRef: HTMLUListElement;
  const [isMenuShown, setIsMenuShown] = createSignal<boolean>(false);

  const { validateAuth, lastAuthStatus } = useAuthRedirect('preserve');

  const handleMenuOutsideClick = (e: MouseEvent) => {
    // outside click
    if (!menuRef?.contains(e.target as HTMLElement) && isMenuShown()) {
      setIsMenuShown(false);
    }
  };

  onMount(() => {
    validateAuth('preserve');
    window.addEventListener('click', handleMenuOutsideClick);
  });

  onCleanup(() => {
    window.removeEventListener('click', handleMenuOutsideClick);
  });

  const status = (): {
    color: string;
    text: string;
  } => {
    if (!lastAuthStatus()) return { color: 'gray', text: 'Unknown' };

    if (lastAuthStatus()?.isServerReachable) {
      if (lastAuthStatus()?.isAuthenticated) {
        return { color: 'limegreen', text: 'Authenticated' };
      } else {
        return { color: 'orange', text: 'Not Authenticated' };
      }
    }
    return { color: 'red', text: 'Disconnected' };
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        class='host_status'
        onClick={(e) => {
          e.stopPropagation();
          setIsMenuShown(!isMenuShown());
        }}
      >
        <div
          style={{
            display: 'flex',
            'flex-direction': 'row',
            height: '100%',
            gap: '0.5rem',
            'align-items': 'center',
            padding: '8px',
            'border-radius': '4px',
          }}
        >
          <Light on={true} color={status().color} />
          <p style={{ color: lastAuthStatus()?.host !== null ? 'inherit' : 'red', 'white-space': 'nowrap' }}>
            {lastAuthStatus()?.host?.name ?? status().text}
          </p>
        </div>
      </div>

      <Show when={isMenuShown()}>
        <ul ref={(ref) => (menuRef = ref)} class='menu'>
          <div
            style={{
              display: 'flex',
              'flex-direction': 'column',
              padding: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                'flex-direction': 'row',
                'flex-wrap': 'wrap',
                'justify-content': 'space-between',
                padding: '8px 12px',
              }}
            >
              <p style={{ 'font-weight': 'bold', 'text-align': 'start' }}>Status</p>
              <p
                style={{
                  'text-align': 'end',
                  color: status().color,
                }}
              >
                {status().text}
              </p>
            </div>
            <div
              style={{
                display: 'flex',
                'flex-direction': 'row',
                'flex-wrap': 'wrap',
                'justify-content': 'space-between',
                padding: '8px 12px',
              }}
            >
              <p style={{ 'font-weight': 'bold', 'text-align': 'start' }}>Host</p>
              <p style={{ 'text-align': 'end' }}>{lastAuthStatus()?.host?.name ?? 'N/A'}</p>
            </div>
            <div
              style={{
                display: 'flex',
                'flex-direction': 'row',
                'flex-wrap': 'wrap',
                'justify-content': 'space-between',
                padding: '8px 12px',
              }}
            >
              <p style={{ 'font-weight': 'bold', 'text-align': 'start' }}>Host IP</p>
              <p style={{ 'text-align': 'end' }}>{lastAuthStatus()?.host?.ip ?? 'N/A'}</p>
            </div>

            <button
              style={{ color: 'red', 'border-color': 'red', width: 'fit-content', 'align-self': 'end', margin: '12px' }}
              onClick={() => {
                logout();
                validateAuth('force-relogin');
              }}
            >
              logout
            </button>
          </div>
        </ul>
      </Show>
    </div>
  );
};
