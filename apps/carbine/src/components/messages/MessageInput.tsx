import { Component, createSignal, Show } from "solid-js";
import AttachmentList from "./attachment/AttachmentList";
import { Attachment } from "@sureshot/api";
import OptimizedAttachmentButton from "./attachment/OptimizedAttachmentButton";
import { createDropzone } from "@soorria/solid-dropzone";
import { createAttachment } from "./attachment/createAttachment";
import { sendMessage } from "@sureshot/api/src";
import { globalStore } from "~/store/GlobalStore";

const MessageInput: Component = () => {
  const [message, setMessage] = createSignal("");
  const [attachments, setAttachments] = createSignal<Attachment[]>([]);
  const [sendStatus, setSendStatus] = createSignal("");
  const [isSending, setIsSending] = createSignal(false);

  const dropZone = createDropzone({
    noClick: true,

    onDrop: async (files: File[]) => {
      const newAttachments: Attachment[] = [];
      for (const file of Array.from(files)) {
        newAttachments.push(await createAttachment(file));
      }
      setAttachments([...attachments(), ...newAttachments]);
    },
  });

  const handleSendMessage = async () => {
    const msg = message().trim();
    const currentAttachments = attachments();

    if (!msg && currentAttachments.length === 0) {
      setSendStatus("❌ Message or attachments are required");
      return;
    }

    setIsSending(true);

    try {
      const result = await sendMessage(
        globalStore.deviceName || "Unknown",
        globalStore.localIp || "unknown",
        msg,
        "text",
        currentAttachments
      );

      if (result.success) {
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
      {...dropZone.getRootProps()}
      style={{
        width: "100%",
        position: "relative",
        display: "flex",
        padding: "1rem",
        "box-sizing": "border-box",
        "flex-direction": "column",
      }}
    >
      <Show when={dropZone.isDragActive}>
        <div
          class={"drop_zone"}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            top: 0,
            left: 0,
          }}
        ></div>
      </Show>
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
          onPaste={async (e) => {
            const { clipboardData } = e;
            if (!clipboardData) return;

            const pastedAttachments: Attachment[] = [];
            for (const file of Array.from(clipboardData.files)) {
              if (file) {
                pastedAttachments.push(await createAttachment(file));
              }
            }

            setAttachments([...attachments(), ...pastedAttachments]);
          }}
        />

        <OptimizedAttachmentButton
          dropZone={dropZone}
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
    </div>
  );
};

export default MessageInput;
