import { Component } from "solid-js";
import { Attachment } from "../../../types/generated/api-types";
import { fallBackMimeType, mimeTypes } from "./MimeTypes";
import { BinaryAttachment } from "../../../api/messages/binaryUpload";

interface Props {
  onAttachmentLoadStart?: () => void;
  onAttachmentLoad?: (attachments: Attachment[]) => void;
  onAttachmentLoadEnd?: () => void;
  acceptedTypes?: string;
  multiple?: boolean;
  maxSizeForBase64?: number; // バイト単位（デフォルト: 1MB）
}

export const OptimizedAttachmentButton: Component<Props> = (props) => {
  let fileInput: HTMLInputElement | undefined = undefined;
  const maxSizeForBase64 = props.maxSizeForBase64 || 1024 * 1024; // 1MB

  const getMimeType = (file: File): string => {
    // ブラウザが検出したMIMEタイプを優先
    if (file.type) {
      return file.type;
    }

    // フォールバック: 拡張子ベースの検出
    const extension = file.name.split(".").pop()?.toLowerCase();
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

  const shouldUseBase64 = (file: File): boolean => {
    // 小さなファイルや特定のファイル形式はBase64を使用
    if (file.size <= maxSizeForBase64) return true;

    // 画像は表示のためBase64が便利
    if (file.type.startsWith("image/")) return true;

    // テキストファイルは可読性のためBase64
    if (file.type.startsWith("text/")) return true;

    return false;
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
              const binaryAttachments: File[] = [];

              for (const file of Array.from(files)) {
                const mimeType = getMimeType(file);
                const useBase64 = shouldUseBase64(file);

                if (useBase64) {
                  // Base64エンコード
                  const arrayBuffer = await file.arrayBuffer();
                  const base64Data = arrayBufferToBase64(arrayBuffer);

                  const attachment: Attachment = {
                    id: generateId(),
                    filename: file.name,
                    mime_type: mimeType,
                    size: file.size,
                    data: base64Data,
                    thumbnail: undefined,
                  };

                  attachments.push(attachment);
                } else {
                  // 大きなファイルの場合は別の処理を提案
                  console.warn(
                    `File ${file.name} is too large (${file.size} bytes) for Base64 encoding. Consider implementing binary upload.`
                  );

                  // とりあえず警告を出して、Base64でエンコード
                  const arrayBuffer = await file.arrayBuffer();
                  const base64Data = arrayBufferToBase64(arrayBuffer);

                  const attachment: Attachment = {
                    id: generateId(),
                    filename: file.name,
                    mime_type: mimeType,
                    size: file.size,
                    data: base64Data,
                    thumbnail: undefined,
                  };

                  attachments.push(attachment);
                }
              }

              props.onAttachmentLoad?.(attachments);
              if (e.currentTarget) e.currentTarget.value = "";
            } catch (error) {
              console.error("Failed to process attachments:", error);
            } finally {
              props.onAttachmentLoadEnd?.();
            }
          }
        }}
      />
      <img
        src={"/add_image.png"}
        width={16}
        height={16}
        style={{
          width: "16px",
          height: "16px",
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

export default OptimizedAttachmentButton;
