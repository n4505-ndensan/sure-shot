import "./App.scss";

import { Component, onMount, createSignal } from "solid-js";
import { updateServerList } from "./inquiry/updateServerList";
import { sendMessage } from "./inquiry/sendMessage";
import { globalStore } from "./store/GlobalStore";

const App: Component = () => {
  const [targetIp, setTargetIp] = createSignal("");
  const [message, setMessage] = createSignal("");
  const [sendStatus, setSendStatus] = createSignal("");
  const [isSending, setIsSending] = createSignal(false);

  onMount(() => {
    updateServerList();
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

  const portList = () => {
    if (!globalStore.ports) {
      return <p>Loading...</p>;
    } else if (globalStore.ports.length === 0) {
      return <p>No ports found.</p>;
    }

    return (
      <div
        style={{
          display: "flex",
          "flex-direction": "column",
          "margin-top": "1rem",
        }}
      >
        {globalStore.ports.map(({ message, ip, name, port, status }) => {
          return (
            <div
              style={{
                display: "flex",
                "flex-direction": "row",
                gap: "1rem",
                padding: "0.5rem",
                "border-radius": "4px",
                cursor: status ? "pointer" : "default",
                "background-color": status ? "#f0f8ff" : "transparent",
                border: status ? "1px solid #e0e8f0" : "1px solid transparent",
              }}
              onClick={() => {
                if (status) {
                  setTargetIp(ip);
                }
              }}
              title={status ? `Click to select ${name} (${ip})` : ""}
            >
              <p>{ip}</p>
              <p
                style={{
                  "font-weight": "bold",
                  color: status ? "limegreen" : "gray",
                }}
              >
                {status ? name : "-"}
              </p>
              {status && (
                <p style={{ color: "#666", "font-size": "0.8rem" }}>
                  👤 {name}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div style={{ padding: "2rem" }}>
        <h1 class="header">search ports</h1>

        <button onClick={updateServerList}>retry</button>

        {portList()}

        <div
          style={{
            display: "flex",
            "flex-direction": "column",
            gap: "1rem",
            "margin-top": "2rem",
            "padding": "1rem",
            "border": "1px solid #ccc",
            "border-radius": "8px",
            "background-color": "#f9f9f9",
          }}
        >
          <h2 style={{ margin: "0", "font-size": "1.2rem" }}>Send Message</h2>
          
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
              onInput={(e) => setTargetIp(e.currentTarget.value)}
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
                "background-color": sendStatus().includes("✅") ? "#d4edda" : "#f8d7da",
                color: sendStatus().includes("✅") ? "#155724" : "#721c24",
                "font-size": "0.9rem",
              }}
            >
              {sendStatus()}
            </div>
          )}
          
          <div style={{ "font-size": "0.8rem", color: "#666" }}>
            💡 Tip: Click on a server above to auto-fill the IP address
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
