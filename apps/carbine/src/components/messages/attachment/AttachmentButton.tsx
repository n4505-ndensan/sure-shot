import { Component } from "solid-js";
import { Attachment } from "@sureshot/api";
import { fallBackMimeType, mimeTypes } from "./MimeTypes";

interface Props {
  onAttachmentLoadStart?: () => void;
  onAttachmentLoad?: (attachments: Attachment[]) => void;
  onAttachmentLoadEnd?: () => void;
  acceptedTypes?: string; // "image/*" | "*/*" | "image/*,.pdf,.doc,.docx"
  multiple?: boolean;
}

export const AttachmentButton: Component<Props> = (props) => {
  let fileInput: HTMLInputElement | undefined;

  const getMimeType = (filename: string): string => {
    const extension = filename.split(".").pop()?.toLowerCase();
    return mimeTypes[extension || ""] || fallBackMimeType;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const generateId = (): string => {
    return `attachment_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  };

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        multiple={props.multiple ?? true}
        accept={props.acceptedTypes ?? "*/*"}
        style={{ display: "none" }}
        onChange={async (e) => {
          const files = e.currentTarget.files;
          if (files) {
            props.onAttachmentLoadStart?.();

            try {
              const attachments: Attachment[] = [];

              for (const file of Array.from(files)) {
                const arrayBuffer = await file.arrayBuffer();
                const base64Data = arrayBufferToBase64(arrayBuffer);

                const attachment: Attachment = {
                  id: generateId(),
                  filename: file.name,
                  mime_type: getMimeType(file.name),
                  size: file.size,
                  data: base64Data,
                  thumbnail: undefined, // 今後必要に応じて実装
                };

                attachments.push(attachment);
              }

              props.onAttachmentLoad?.(attachments);

              // フォームをリセット
              e.currentTarget.value = "";
            } catch (error) {
              console.error("Failed to process attachments:", error);
            } finally {
              props.onAttachmentLoadEnd?.();
            }
          }
        }}
      />
      <img
        src={"/folder.png"}
        width={12}
        height={12}
        style={{
          width: "12px",
          height: "12px",
          cursor: "pointer",
          "pointer-events": "all",
          "image-rendering": "pixelated",
        }}
        onClick={() => {
          fileInput?.click();
        }}
      />
    </>
  );
};

export default AttachmentButton;
