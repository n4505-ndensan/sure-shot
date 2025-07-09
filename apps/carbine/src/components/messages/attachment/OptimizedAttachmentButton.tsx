import { Component } from "solid-js";
import { Attachment } from "../../../types/generated/api-types";
import { arrayBufferToBase64, getMimeType } from "../../../utils/FileUtils";
import { generateId } from "../../../utils/IdUtils";
import { createAttachment } from "./createAttachment";

interface Props {
  dropZone: any;
  onAttachmentLoadStart?: () => void;
  onAttachmentLoad?: (attachments: Attachment[]) => void;
  onAttachmentLoadEnd?: () => void;
  acceptedTypes?: string;
  multiple?: boolean;
  maxSizeForBase64?: number; // バイト単位（デフォルト: 1MB）
}

export const OptimizedAttachmentButton: Component<Props> = (props) => {
  let fileInput: HTMLInputElement | undefined;
  const maxSizeForBase64 = props.maxSizeForBase64 || 1024 * 1024; // 1MB

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
        {...props.dropZone.getInputProps()}
        type="file"
        multiple={props.multiple ?? true}
        accept={props.acceptedTypes ?? "*/*"}
        style={{ display: "none" }}
        onDrop={(e) => {
          console.log("huh");
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }}
        onBeforeInput={(e) => {
          console.log("onBeforeInput triggered");
        }}
        onChange={async (e) => {
          const files = e.currentTarget.files;
          if (files) {
            props.onAttachmentLoadStart?.();

            try {
              const attachments: Attachment[] = [];

              for (const file of Array.from(files)) {
                const mimeType = getMimeType(file);
                const useBase64 = shouldUseBase64(file);

                if (useBase64) {
                  attachments.push(await createAttachment(file));
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

export default OptimizedAttachmentButton;
