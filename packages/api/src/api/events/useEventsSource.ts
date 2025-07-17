import { createSignal, onCleanup } from 'solid-js';
import { AuthManager } from '../../auth/AuthManager';
import { ReceivedMessage } from '../../types/generated/api-types';

interface Props {
  closedCheckIntervalMs?: number;
  reconnectWhenClosed?: boolean;
  onMessage: (message: ReceivedMessage) => void;
}

export function useEventsSource(props: Props): {
  eventSource: () => EventSource | null;
  error: () => string | undefined;
  isConnected: () => boolean;
} {
  const [eventSource, setEventSource] = createSignal<EventSource | null>(null);
  const [connectionError, setConnectionError] = createSignal<string | undefined>(undefined);
  const [isConnected, setIsConnected] = createSignal(false);

  let reconnectTimeoutId: number | null = null;
  let reconnectIntervalId: number | null = null;
  const shouldReconnect = props.reconnectWhenClosed ?? true;

  // 再接続をスケジュール（一回限りの遅延実行）
  const scheduleReconnect = () => {
    if (!shouldReconnect) return;

    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId);
    }

    reconnectTimeoutId = window.setTimeout(() => {
      console.log('Attempting scheduled reconnect...');
      initializeSSE();
    }, 3000); // 3秒後に再接続を試行
  };

  // 定期的な接続状態チェック
  const startConnectionMonitor = () => {
    if (!shouldReconnect) return;

    reconnectIntervalId = window.setInterval(() => {
      const es = eventSource();
      if (es && (es.readyState === EventSource.CLOSED || es.readyState === EventSource.CONNECTING)) {
        console.log(`Connection state: ${es.readyState === EventSource.CLOSED ? 'CLOSED' : 'CONNECTING'}, attempting reconnect...`);
        setIsConnected(false);
        initializeSSE();
      }
    }, props.closedCheckIntervalMs || 5000);
  };

  // SSE接続の初期化
  const initializeSSE = async () => {
    try {
      // 既存の接続をクリーンアップ
      const currentEventSource = eventSource();
      if (currentEventSource) {
        currentEventSource.close();
      }

      // 再接続タイマーをクリア
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = null;
      }

      // 接続モニターをクリア
      if (reconnectIntervalId) {
        clearInterval(reconnectIntervalId);
        reconnectIntervalId = null;
      }

      const authManager = AuthManager.getInstance();

      if (!authManager.isAuthenticated()) {
        throw new Error('Not authenticated');
      }

      const eventsUrl = `${authManager.getBaseUrl()}/events`;
      let newEventSource = new EventSource(eventsUrl);

      newEventSource.onopen = () => {
        console.log('SSE connection opened to:', eventsUrl);
        setIsConnected(true);
        setConnectionError(undefined);

        // 接続成功後に定期監視を開始
        startConnectionMonitor();
      };

      newEventSource.onmessage = (event) => {
        try {
          const message: ReceivedMessage = JSON.parse(event.data);
          props.onMessage(message);
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };

      newEventSource.onerror = (error) => {
        console.error('SSE error:', error);
        setIsConnected(false);
        setConnectionError('Connection lost.');

        // 自動再接続をスケジュール
        scheduleReconnect();
      };

      setEventSource(newEventSource);
    } catch (error) {
      console.error('Failed to initialize SSE:', error);
      setIsConnected(false);
      setConnectionError('Failed to initialize connection');

      // 認証エラー以外の場合は再接続をスケジュール
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('Not authenticated')) {
        scheduleReconnect();
      }
    }
  };

  // 初期接続
  initializeSSE();

  // クリーンアップ
  onCleanup(() => {
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId);
    }
    if (reconnectIntervalId) {
      clearInterval(reconnectIntervalId);
    }
    const currentEventSource = eventSource();
    if (currentEventSource) {
      currentEventSource.close();
    }
  });

  return {
    eventSource,
    error: connectionError,
    isConnected,
  };
}
