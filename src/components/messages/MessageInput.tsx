import { Component, createSignal, createEffect } from "solid-js";
import { sendMessage } from "../../api/messages/send";
import { AttachmentButton } from "./attachment/AttachmentButton";
import AttachmentList from "./attachment/AttachmentList";
import { Attachment } from "../../types/generated/api-types";
import OptimizedAttachmentButton from "./attachment/OptimizedAttachmentButton";

interface Props {
  targetIp?: string;
  onIpChange?: (ip: string) => void;
}

const MessageInput: Component<Props> = (props) => {
  const [targetIp, setTargetIp] = createSignal("");
  const [message, setMessage] = createSignal("");
  const [attachments, setAttachments] = createSignal<Attachment[]>([]);
  const [sendStatus, setSendStatus] = createSignal("");
  const [isSending, setIsSending] = createSignal(false);

  // propsからtargetIpが渡されたら、内部状態を更新
  createEffect(() => {
    if (props.targetIp !== undefined) {
      setTargetIp(props.targetIp);
    }
  });

  const handleSendMessage = async () => {
    const ip = targetIp().trim();
    const msg = message().trim();
    const currentAttachments = attachments();

    if (!msg && currentAttachments.length === 0) {
      setSendStatus("❌ Message or attachments are required");
      return;
    }

    setIsSending(true);
    setSendStatus("📤 Sending message...");

    try {
      const result = await sendMessage(ip, msg, "text", currentAttachments);

      if (result.success) {
        setSendStatus("✅ Message sent successfully!");
        setMessage(""); // メッセージフィールドをクリア
        setAttachments([]); // 添付ファイルをクリア
      } else {
        setSendStatus(`❌ Failed: ${result.message}`);
      }
    } catch (error) {
      setSendStatus(`❌ Error: ${error}`);
    } finally {
      setIsSending(false);
      // 3秒後にステータスメッセージをクリア
      setTimeout(() => setSendStatus(""), 3000);
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !isSending()) {
      handleSendMessage();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
        gap: "0.75rem",
        "margin-top": "2rem",
        padding: "1rem",
        border: "1px solid #ccc",
        "border-radius": "8px",
        "background-color": "#f9f9f9",
      }}
    >
      <h2 style={{ margin: "0", "font-size": "12px" }}>Send Message</h2>

      <div
        style={{
          display: "flex",
          "flex-direction": "row",
          "align-items": "center",
          gap: "1rem",
        }}
      >
        {/* <input
          name="ip"
          placeholder="Target IP (e.g., 192.168.1.100)"
          value={targetIp()}
          onInput={(e) => {
            setTargetIp(e.currentTarget.value);
            props.onIpChange?.(e.currentTarget.value);
          }}
          style={{ width: "200px" }}
        /> */}
        <input
          name="message"
          placeholder="Type your message..."
          value={message()}
          onInput={(e) => setMessage(e.currentTarget.value)}
          onKeyPress={handleKeyPress}
          style={{ flex: 1 }}
          disabled={isSending()}
        />

        <OptimizedAttachmentButton
          onAttachmentLoadStart={() =>
            setSendStatus("📤 Loading attachments...")
          }
          onAttachmentLoad={(newAttachments) =>
            setAttachments([...attachments(), ...newAttachments])
          }
          onAttachmentLoadEnd={() => setSendStatus("")}
          acceptedTypes="*/*"
          multiple={true}
        />

        <button
          onClick={handleSendMessage}
          disabled={
            isSending() || (!message().trim() && attachments().length === 0)
          }
          style={{
            padding: "0.5rem 1rem",
            "background-color": isSending() ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            "border-radius": "4px",
            cursor: isSending() ? "not-allowed" : "pointer",
          }}
        >
          {isSending() ? "Sending..." : "Send"}
        </button>
      </div>

      {sendStatus() && (
        <div
          style={{
            padding: "0.5rem",
            "border-radius": "4px",
            "background-color": sendStatus().includes("✅")
              ? "#d4edda"
              : sendStatus().includes("📤")
              ? "#f8f9fa"
              : "#f8d7da",
            color: sendStatus().includes("✅")
              ? "#155724"
              : sendStatus().includes("📤")
              ? "#6c757d"
              : "#721c24",
            "font-size": "12px",
          }}
        >
          {sendStatus()}
        </div>
      )}

      <AttachmentList
        attachments={attachments()}
        onDeleteAttachment={(id) => {
          setAttachments(
            attachments().filter((attachment) => attachment.id !== id)
          );
        }}
      />

      <div style={{ "font-size": "12px", color: "#666" }}>
        💡 Tip: Click on a server above to auto-fill the IP address, or drag &
        drop files to attach
      </div>
    </div>
  );
};

export default MessageInput;
