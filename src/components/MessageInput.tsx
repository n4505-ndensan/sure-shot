import { Component, createSignal, createEffect } from "solid-js";
import { sendMessage } from "../api/messages/send";

interface Props {
  targetIp?: string;
  onIpChange?: (ip: string) => void;
}

const MessageInput: Component<Props> = (props) => {
  let fileInput: HTMLInputElement | undefined = undefined;

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

    if (!msg) {
      setSendStatus("❌ message is required");
      return;
    }

    function arrayBufferToBase64(buffer) {
      var binary = "";
      var bytes = new Uint8Array(buffer);
      var len = bytes.byteLength;
      for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    }

    setIsSending(true);
    setSendStatus("📤 Sending message...");

    try {
      if (fileInput?.files.length > 0) {
        const fileType = fileInput.files[0].type;
        console.log("File type:", fileType);
        const firstFileBuffer = await fileInput?.files[0]?.arrayBuffer();
        const base64 = arrayBufferToBase64(firstFileBuffer);

        console.log(base64);

        const data64url = `data:${fileType};base64,${base64}`;

        const result = await sendMessage(ip, data64url, "image");
        if (result.success) {
          console.log("Image sent successfully");
        } else {
          console.error("Image sent failed:", result.message);
        }
      }
      const result = await sendMessage(ip, msg, "text");

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
          disabled={isSending() || !message().trim()}
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
      <input ref={fileInput} type="file" id="file_input" multiple />

      <div style={{ "font-size": "12px", color: "#666" }}>
        💡 Tip: Click on a server above to auto-fill the IP address
      </div>
    </div>
  );
};

export default MessageInput;
