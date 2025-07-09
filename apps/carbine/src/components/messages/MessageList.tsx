import {
  Component,
  createSignal,
  createEffect,
  onCleanup,
  Show,
} from "solid-js";
import { For } from "solid-js";
import { ReceivedMessage } from "@sureshot/api";
import LinkifiedText from "../common/LinkifiedText";
import { globalStore } from "~/store/GlobalStore";
import { getMessages, useEventsSource } from "@sureshot/api/src";
import { sendNotification } from "@tauri-apps/plugin-notification";

interface Props {
  className?: string;
}

const MessageList: Component<Props> = (props) => {
  let scrollList: HTMLDivElement | undefined;
  const [messages, setMessages] = createSignal<ReceivedMessage[] | undefined>(
    undefined
  );
  const { eventSource, isConnected, error } = useEventsSource(
    (message: ReceivedMessage) => {
      setMessages((prev) => [...(prev || []), message]);
      if (message.from !== globalStore.localIp) {
        sendNotification({
          channelId: "messages",
          silent: false,
          icon: "~/../public/icon.png",
          title: message.from_name || "New Message",
          body: message.message || "You have a new message",
          group: "messages",

          // attachments: [
          //   {
          //     id: "image-1",
          //     url: "asset:///notification-image.jpg",
          //   },
          // ],
        });
      }
    }
  );

  // 過去のメッセージを取得
  const loadPastMessages = async () => {
    const messages = await getMessages();
    if (messages) {
      setMessages(messages);
    } else {
      console.error("Failed to load past messages");
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
  });

  createEffect(() => {
    messages();
    // スクロール位置を更新
    if (scrollList) {
      setTimeout(() => {
        scrollList.scrollTop = scrollList.scrollHeight;
      }, 100);
    }
  });

  // クリーンアップ
  onCleanup(() => {
    if (eventSource()) {
      eventSource()?.close();
    }
  });

  return (
    <div class={props.className}>
      <div
        style={{
          display: "flex",
          "justify-content": "space-between",
          "align-items": "center",
          margin: "1rem",
        }}
      >
        <p style={{ margin: "0", "font-size": "12px", "font-weight": "bold" }}>
          Messages ({messages()?.length || "-"})
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

      {error() && (
        <div
          style={{
            padding: "0.5rem",
            "background-color": "#f8d7da",
            color: "#721c24",
            "border-radius": "4px",
            "font-size": "12px",
          }}
        >
          {error()}
        </div>
      )}

      <div
        ref={scrollList}
        style={{
          height: "400px",
          "overflow-y": "auto",
          "border-top": "1px solid #ddd",
          "border-radius": "4px",
          padding: "0.5rem",
          "background-color": "#f9f9f9",
        }}
      >
        <For each={messages()}>
          {(message) => {
            const isSelf = message.from === globalStore.localIp;
            return (
              <div
                style={{
                  padding: "0.5rem",
                  margin: "0.25rem 0",
                  "background-color": isSelf ? "#e3f2fd" : "white",
                  "border-radius": "4px",
                  "border-left": isSelf
                    ? "3px solid #2196f3"
                    : "3px solid #4caf50",
                  "margin-left": isSelf ? "40%" : "0",
                  "margin-right": isSelf ? "0" : "40%",
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
                  <div
                    style={{
                      display: "flex",
                      "flex-direction": "row",
                      "align-items": "baseline",
                      gap: "0.25rem",
                    }}
                  >
                    <strong
                      style={{
                        "font-size": "12px",
                        color: isSelf ? "#1976d2" : "#495057",
                      }}
                    >
                      {isSelf ? "You" : message.from_name}
                      {/* {message.from_name} */}
                    </strong>
                    <div
                      style={{
                        "font-size": "10px",
                        color: "#6c757d",
                        "margin-bottom": "0.25rem",
                      }}
                    >
                      ({message.from})
                    </div>
                  </div>
                  <span style={{ "font-size": "10px", color: "#6c757d" }}>
                    {formatTime(message.timestamp)}
                  </span>
                </div>
                <div
                  style={{
                    "font-size": "12px",
                    color: "#212529",
                    "font-weight": isSelf ? "500" : "normal",
                  }}
                >
                  {/* メッセージテキスト */}
                  <Show when={message.message.trim()}>
                    <div style={{ "margin-bottom": "0.5rem" }}>
                      <LinkifiedText text={message.message} />
                    </div>
                  </Show>

                  {/* 添付ファイル */}
                  <Show
                    when={message.attachments && message.attachments.length > 0}
                  >
                    <div
                      style={{
                        display: "flex",
                        "flex-wrap": "wrap",
                        gap: "0.5rem",
                      }}
                    >
                      <For each={message.attachments}>
                        {(attachment) => (
                          <div
                            style={{
                              position: "relative",
                              width: "100%",
                              display: "flex",
                              gap: "1px",
                              "margin-bottom": "3px",
                              "flex-direction": "column",
                            }}
                          >
                            <Show
                              when={attachment.mime_type.startsWith("image/")}
                            >
                              <img
                                src={`data:${attachment.mime_type};base64,${attachment.data}`}
                                alt={attachment.filename}
                                style={{
                                  width: "fit-content",
                                  height: "200px",
                                  "border-radius": "4px",
                                  "object-fit": "contain",
                                }}
                              />
                              <p
                                style={{
                                  "margin-right": !isSelf ? "auto" : "0",
                                  "margin-left": isSelf ? "auto" : "0",
                                }}
                              >
                                {/* <span
                                style={{
                                  "font-size": "9px",
                                  "text-decoration": "underline",
                                }}
                              >
                                ↓
                              </span> */}
                                <a
                                  style={{
                                    "font-size": "9px",
                                    width: "auto",
                                    // "margin-left": "0.25rem",
                                    cursor: "pointer",
                                  }}
                                  onClick={() => {
                                    // if (isSelf) return;
                                    const link = document.createElement("a");
                                    const href = `data:${attachment.mime_type};base64,${attachment.data}`;
                                    link.href = href;
                                    link.download = attachment.filename;
                                    link.click();
                                  }}
                                >
                                  {attachment.filename} (
                                  {(attachment.size / 1024).toFixed(1)} KB)
                                </a>
                              </p>
                            </Show>
                            <Show
                              when={!attachment.mime_type.startsWith("image/")}
                            >
                              <div
                                style={{
                                  padding: "0.5rem",
                                  border: "1px solid #ccc",
                                  "border-radius": "4px",
                                  "background-color": "#f8f9fa",
                                  width: "100%",
                                  gap: "8px",
                                  "box-sizing": "border-box",
                                }}
                              >
                                <a
                                  style={{
                                    "font-size": "12px",
                                    "font-weight": "bold",
                                    cursor: "pointer",
                                  }}
                                  onClick={() => {
                                    // if (isSelf) return;
                                    const link = document.createElement("a");
                                    link.href = `data:${attachment.mime_type};base64,${attachment.data}`;
                                    link.download = attachment.filename;
                                    link.click();
                                  }}
                                >
                                  {attachment.filename}
                                </a>
                                <div
                                  style={{
                                    "font-size": "10px",
                                    color: "#6c757d",
                                  }}
                                >
                                  {attachment.mime_type} |{" "}
                                  {(attachment.size / 1024).toFixed(1)} KB
                                </div>
                              </div>
                            </Show>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>

                  {/* 従来の画像表示（下位互換性のため） */}
                  <Show
                    when={
                      message.message_type === "image" &&
                      !message.attachments?.length
                    }
                  >
                    <img
                      src={message.message}
                      alt="Image message"
                      style={{
                        "max-width": "100%",
                        "max-height": "200px",
                        "border-radius": "4px",
                      }}
                    />
                  </Show>
                </div>
              </div>
            );
          }}
        </For>

        {messages() && messages()?.length === 0 && (
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
