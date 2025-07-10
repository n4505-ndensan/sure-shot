import { createSignal } from "solid-js";
import { ReceivedMessage } from "../../types/generated/api-types";
import { AuthManager } from "../../auth/AuthManager";

export function useEventsSource(
  onMessage: (message: ReceivedMessage) => void
): {
  eventSource: () => EventSource | null;
  isConnected: () => boolean;
  error: () => string | undefined;
} {
  const [eventSource, setEventSource] = createSignal<EventSource | null>(null);
  const [isConnected, setIsConnected] = createSignal(false);
  const [connectionError, setConnectionError] = createSignal<
    string | undefined
  >(undefined);

  // SSE接続の初期化
  const initializeSSE = async () => {
    try {
      const authManager = AuthManager.getInstance();

      if (!authManager.isAuthenticated()) {
        throw new Error("Not authenticated");
      }

      const eventsUrl = `${authManager.getBaseUrl()}/events`;
      let eventSource = new EventSource(eventsUrl);

      eventSource.onopen = () => {
        console.log("SSE connection opened to:", eventsUrl);
        setIsConnected(true);
        setConnectionError(undefined);
      };

      eventSource.onmessage = (event) => {
        try {
          const message: ReceivedMessage = JSON.parse(event.data);
          onMessage(message);
        } catch (error) {
          console.error("Failed to parse SSE message:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE error:", error);
        setIsConnected(false);
        setConnectionError("Connection lost. Retrying...");
      };

      setEventSource(eventSource);
    } catch (error) {
      console.error("Failed to initialize SSE:", error);
      setConnectionError("Failed to initialize connection");
    }
  };
  initializeSSE();

  return {
    eventSource,
    isConnected,
    error: connectionError,
  };
}
