import { ReceivedMessage } from '@sureshot/api';
import { getMessages, useEventsSource } from '@sureshot/api/src';
import { sendNotification } from '@tauri-apps/plugin-notification';
import { Component, createSignal, For, onMount, Show } from 'solid-js';
import { onResume } from 'tauri-plugin-app-events-api';
import { globalStore } from '~/store/GlobalStore';
import { isMobile } from '~/utils/PlatformUtils';
import MessageItem from './MessageItem';

// バックグラウンド通知プラグインをインポート

interface Props {
  className?: string;
}

const MessageList: Component<Props> = (props) => {
  let scrollList: HTMLDivElement | undefined;
  const [messages, setMessages] = createSignal<ReceivedMessage[] | undefined>(undefined);
  const { error, isConnected } = useEventsSource({
    onMessage: (message: ReceivedMessage) => {
      console.log('Received message:', message);
      setMessages((prev) => [...(prev || []), message]);

      if (scrollList) {
        setTimeout(() => {
          scrollList.scrollTop = scrollList.scrollHeight;
        }, 100);
      }

      if (message.from !== globalStore.localIp) {
        if (!isMobile())
          sendNotification({
            channelId: 'messages',
            silent: false,
            title: message.from_name || 'New Message',
            body: message.message || 'You have a new message',
          });
      }
    },
  });

  // 過去のメッセージを取得
  const loadPastMessages = async () => {
    const messages = await getMessages();
    console.log('Loaded past messages:', messages);
    if (messages !== undefined) {
      setMessages(messages);
    } else {
      console.error('Failed to load past messages');
    }
  };

  onMount(async () => {
    await loadPastMessages();

    if (scrollList) {
      setTimeout(() => {
        scrollList.scrollTop = scrollList.scrollHeight;
      }, 100);
    }
  });

  onResume(async () => {
    await loadPastMessages();
    // if (isMobile()) {
    //   await stopBackgroundService();
    // }
  });

  // onPause(async () => {
  //   if (isMobile()) {
  //     const authStatus = getAuthStatus();
  //     console.log('Auth status on pause:', `http://${authStatus?.host?.ip}:${authStatus?.host?.port}`);
  //     if (authStatus && authStatus.isAuthenticated && authStatus.host) {
  //       await startBackgroundService({
  //         serverUrl: `http://${authStatus.host.ip}:${authStatus.host.port}`,
  //       });
  //     }
  //   }
  // });

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        'flex-direction': 'column',
        width: '100%',
        overflow: 'hidden',
        'flex-grow': 1,
      }}
    >
      <div
        ref={scrollList}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          'overflow-x': 'hidden',
          'overflow-y': 'auto',
          padding: '0.5rem',
        }}
      >
        <For each={messages()}>
          {(message) => {
            const isSelf = message.from === globalStore.localIp;
            return <MessageItem isSelf={isSelf} message={message} />;
          }}
        </For>

        {messages() && messages()?.length === 0 && (
          <div
            style={{
              'text-align': 'center',
              color: '#6c757d',
              'font-size': '12px',
              padding: '2rem',
            }}
          >
            No messages yet. Send a message to see it appear here!
          </div>
        )}

        <Show when={error()}>
          <div
            style={{
              display: 'flex',
              'flex-direction': 'column',
              height: '100px',
              'justify-content': 'center',
              'align-items': 'center',
              gap: '0.5rem',
            }}
          >
            <p>connection lost.</p>
            <button onClick={() => location.reload()}>Reconnect</button>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default MessageList;
