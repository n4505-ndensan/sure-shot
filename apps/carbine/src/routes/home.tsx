import { Component, onMount } from 'solid-js';
import AppLayout from '~/components/layout/AppLayout';
import MessageInput from '~/components/messages/MessageInput';
import MessageList from '~/components/messages/MessageList';

import '@styles/main.css';
import { getAuthStatus } from '@sureshot/api/src';
import { startBackgroundService, stopBackgroundService } from 'tauri-plugin-carbine-notifications';
import { isMobile } from '~/utils/PlatformUtils';
import { useAuthRedirect } from '~/utils/useAuthRedirect';

const Home: Component = () => {
  const { validateAuth } = useAuthRedirect('preserve');

  onMount(async () => {
    await validateAuth('preserve');

    if (isMobile()) {
      const authStatus = getAuthStatus();
      console.log('Auth status on pause:', `http://${authStatus?.host?.ip}:${authStatus?.host?.port}`);
      if (authStatus && authStatus.isAuthenticated && authStatus.host) {
        await stopBackgroundService();
        await startBackgroundService({
          serverUrl: `http://${authStatus.host.ip}:${authStatus.host.port}`,
        });
      }
    }
  });

  return (
    <AppLayout showConnectionStatus={true}>
      <div
        style={{
          width: '100%',
          height: '1px',
          'background-color': '#ddd',
        }}
      />

      <MessageList />

      <div
        style={{
          width: '100%',
          height: '1px',
          'background-color': '#ddd',
        }}
      />

      <MessageInput />
    </AppLayout>
  );
};

export default Home;
