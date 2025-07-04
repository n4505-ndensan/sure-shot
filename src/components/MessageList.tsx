import { Component, createSignal, createEffect, onCleanup } from "solid-js";
import { For } from "solid-js";
import { ReceivedMessage } from "../types/generated/api-types";

interface Props {
  className?: string;
}

const MessageList: Component<Props> = (props) => {
  const [messages, setMessages] = createSignal<ReceivedMessage[]>([]);
  const [isConnected, setIsConnected] = createSignal(false);
  const [connectionError, setConnectionError] = createSignal<string | null>(
    null
  );

  let eventSource: EventSource | null = null;

  // SSE接続の初期化
  const initializeSSE = async () => {
    try {
      eventSource = new EventSource("http://localhost:8000/events");

      eventSource.onopen = () => {
        console.log("SSE connection opened");
        setIsConnected(true);
        setConnectionError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const message: ReceivedMessage = JSON.parse(event.data);
          setMessages((prev) => [...prev, message]);
        } catch (error) {
          console.error("Failed to parse SSE message:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE error:", error);
        setIsConnected(false);
        setConnectionError("Connection lost. Retrying...");
      };
    } catch (error) {
      console.error("Failed to initialize SSE:", error);
      setConnectionError("Failed to initialize connection");
    }
  };

  // 過去のメッセージを取得
  const loadPastMessages = async () => {
    try {
      const response = await fetch("http://localhost:8000/messages");
      if (response.ok) {
        const pastMessages: ReceivedMessage[] = await response.json();
        setMessages(pastMessages);
      }
    } catch (error) {
      console.error("Failed to load past messages:", error);
    }
  };

  // 時刻をフォーマット
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch {
      return timestamp;
    }
  };

  // 初期化
  createEffect(() => {
    loadPastMessages();
    initializeSSE();
  });

  // クリーンアップ
  onCleanup(() => {
    if (eventSource) {
      eventSource.close();
    }
  });

  return (
    <div class={props.className}>
      <div
        style={{
          display: "flex",
          "justify-content": "space-between",
          "align-items": "center",
          "margin-bottom": "1rem",
        }}
      >
        <p style={{ margin: "0", "font-size": "12px", "font-weight": "bold" }}>
          Messages ({messages().length})
        </p>
        <div
          style={{
            display: "flex",
            "align-items": "center",
            gap: "0.5rem",
            "font-size": "12px",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              "border-radius": "50%",
              "background-color": isConnected() ? "#28a745" : "#dc3545",
            }}
          />
          <span style={{ color: isConnected() ? "#28a745" : "#dc3545" }}>
            {isConnected() ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {connectionError() && (
        <div
          style={{
            padding: "0.5rem",
            "background-color": "#f8d7da",
            color: "#721c24",
            "border-radius": "4px",
            "margin-bottom": "1rem",
            "font-size": "12px",
          }}
        >
          {connectionError()}
        </div>
      )}

      <div
        style={{
          height: "300px",
          "overflow-y": "auto",
          border: "1px solid #ddd",
          "border-radius": "4px",
          padding: "0.5rem",
          "background-color": "#f9f9f9",
        }}
      >
        <For each={messages()}>
          {(message) => (
            <div
              style={{
                padding: "0.5rem",
                margin: "0.25rem 0",
                "background-color": message.is_self ? "#e3f2fd" : "white",
                "border-radius": "4px",
                "border-left": message.is_self 
                  ? "3px solid #2196f3" 
                  : "3px solid #4caf50",
                "margin-left": message.is_self ? "1rem" : "0",
                "margin-right": message.is_self ? "0" : "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  "justify-content": "space-between",
                  "align-items": "center",
                  "margin-bottom": "0.25rem",
                }}
              >
                <strong style={{ 
                  "font-size": "12px", 
                  color: message.is_self ? "#1976d2" : "#495057"
                }}>
                  {message.is_self ? "You" : message.from_name}
                </strong>
                <span style={{ "font-size": "10px", color: "#6c757d" }}>
                  {formatTime(message.timestamp)}
                </span>
              </div>
              {!message.is_self && (
                <div
                  style={{
                    "font-size": "12px",
                    color: "#6c757d",
                    "margin-bottom": "0.25rem",
                  }}
                >
                  from {message.from}
                </div>
              )}
              <div style={{ 
                "font-size": "13px", 
                color: "#212529",
                "font-weight": message.is_self ? "500" : "normal",
              }}>
                {message.message}
              </div>
            </div>
          )}
        </For>

        {messages().length === 0 && (
          <div
            style={{
              "text-align": "center",
              color: "#6c757d",
              "font-size": "12px",
              padding: "2rem",
            }}
          >
            No messages yet. Send a message to see it appear here!
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageList;
