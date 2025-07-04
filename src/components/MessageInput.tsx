import { Component, createSignal, createEffect } from "solid-js";
import { sendMessage } from "../inquiry/sendMessage";

interface Props {
  targetIp?: string;
  onIpChange?: (ip: string) => void;
}

const MessageInput: Component<Props> = (props) => {
  const [targetIp, setTargetIp] = createSignal("");
  const [message, setMessage] = createSignal("");
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

    if (!ip || !msg) {
      setSendStatus("❌ IP and message are required");
      return;
    }

    setIsSending(true);
    setSendStatus("📤 Sending message...");

    try {
      const result = await sendMessage(ip, msg);

      if (result.success) {
        setSendStatus("✅ Message sent successfully!");
        setMessage(""); // メッセージフィールドをクリア
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
        gap: "1rem",
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
          gap: "1rem",
        }}
      >
        <input
          name="ip"
          placeholder="Target IP (e.g., 192.168.1.100)"
          value={targetIp()}
          onInput={(e) => {
            setTargetIp(e.currentTarget.value);
            props.onIpChange?.(e.currentTarget.value);
          }}
          style={{ width: "200px" }}
        />
        <input
          name="message"
          placeholder="Type your message..."
          value={message()}
          onInput={(e) => setMessage(e.currentTarget.value)}
          onKeyPress={handleKeyPress}
          style={{ flex: 1 }}
          disabled={isSending()}
        />
        <button
          onClick={handleSendMessage}
          disabled={isSending() || !targetIp().trim() || !message().trim()}
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

      <div style={{ "font-size": "12px", color: "#666" }}>
        💡 Tip: Click on a server above to auto-fill the IP address
      </div>
    </div>
  );
};

export default MessageInput;
