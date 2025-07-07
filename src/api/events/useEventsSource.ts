import { createSignal } from "solid-js";
import { ReceivedMessage } from "../../types/generated/api-types";

export function useEventsSource(
  onMessage: (message: ReceivedMessage) => void
): {
  eventSource: () => EventSource | null;
  isConnected: () => boolean;
  error: () => string | null;
} {
  const [eventSource, setEventSource] = createSignal<EventSource | null>(null);
  const [isConnected, setIsConnected] = createSignal(false);
  const [connectionError, setConnectionError] = createSignal<string | null>(
    null
  );

  // SSE接続の初期化
  const initializeSSE = async () => {
    try {
      let eventSource = new EventSource("http://localhost:8000/events");

      eventSource.onopen = () => {
        console.log("SSE connection opened");
        setIsConnected(true);
        setConnectionError(null);
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
