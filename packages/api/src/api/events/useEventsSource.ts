import { Accessor, createSignal, onCleanup, onMount } from 'solid-js';
import { AuthManager } from '../../auth/AuthManager';
import { ReceivedMessage } from '../../types/generated/api-types';

interface Props {
  onMessage: (message: ReceivedMessage) => void;
}

export function useEventsSource(props: Props): {
  error: Accessor<string | undefined>;
  isConnected: Accessor<boolean | undefined>;
} {
  let eventSource: EventSource | null = null;
  const [connectionError, setConnectionError] = createSignal<string | undefined>(undefined);
  const [isConnected, setIsConnected] = createSignal<boolean | undefined>(undefined);

  // SSE接続の初期化
  const initializeSSE = async () => {
    setIsConnected(undefined);
    try {
      if (eventSource) {
        eventSource.close();
      }
      const authManager = AuthManager.getInstance();

      if (!authManager.isAuthenticated()) {
        throw new Error('Not authenticated');
      }

      const eventsUrl = `${authManager.getBaseUrl()}/events`;
      eventSource = new EventSource(eventsUrl);

      eventSource.onopen = () => {
        console.log('SSE connection opened to:', eventsUrl);
        setIsConnected(true);
        setConnectionError(undefined);
      };

      eventSource.onmessage = (event) => {
        try {
          const message: ReceivedMessage = JSON.parse(event.data);
          props.onMessage(message);
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        setIsConnected(false);
        setConnectionError('Connection lost.');
      };
    } catch (error) {
      console.error('Failed to initialize SSE:', error);
      setIsConnected(false);
      setConnectionError('Failed to initialize connection');
    }
  };

  onMount(() => {
    // 初期接続
    setTimeout(() => {
      initializeSSE();
    }, 1000);
  });

  // 定期的に接続を確認
  let validateIntervalId: number | undefined;

  validateIntervalId = setInterval(() => {
    console.log(eventSource?.readyState);
    initializeSSE();
  }, 3000);

  // クリーンアップ
  onCleanup(() => {
    if (eventSource) {
      eventSource.close();
    }

    clearInterval(validateIntervalId);
  });

  return {
    error: connectionError,
    isConnected,
  };
}
