import { Component, onMount } from 'solid-js';
import AppLayout from '~/components/layout/AppLayout';
import MessageInput from '~/components/messages/MessageInput';
import MessageList from '~/components/messages/MessageList';

import '@styles/main.css';
import { useAuthRedirect } from '~/utils/useAuthRedirect';

const Home: Component = () => {
  const { validateAuth } = useAuthRedirect('preserve');

  onMount(() => {
    validateAuth('preserve');
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
