// 将来的なバイナリ送信API設計例

import {
  Attachment,
  SendMessageResponse,
} from "../../types/generated/api-types";

export interface BinaryAttachment {
  id: string;
  filename: string;
  mime_type: string;
  size: number;
  // dataは含まない（サーバーに直接アップロード）
  upload_url?: string; // アップロード用URL
  download_url?: string; // ダウンロード用URL
}

export interface SendMessageRequestV2 {
  to: string;
  message: string;
  message_type: string;
  // 小さなファイル（Base64）
  attachments: Attachment[];
  // 大きなファイル（バイナリ）
  binary_attachments: BinaryAttachment[];
}

// 実装例
export const sendMessageWithBinaryAttachments = async (
  targetIp: string,
  message: string,
  messageType: string,
  smallAttachments: Attachment[],
  largeFiles: File[]
): Promise<SendMessageResponse> => {
  const binaryAttachments: BinaryAttachment[] = [];

  // 1. 大きなファイルを先にアップロード
  for (const file of largeFiles) {
    const formData = new FormData();
    formData.append("file", file);

    const uploadResponse = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const uploadResult = await uploadResponse.json();
    binaryAttachments.push({
      id: uploadResult.id,
      filename: file.name,
      mime_type: file.type,
      size: file.size,
      upload_url: uploadResult.upload_url,
      download_url: uploadResult.download_url,
    });
  }

  // 2. メッセージと添付ファイル情報を送信
  const response = await fetch("http://localhost:8000/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: targetIp,
      message: message,
      message_type: messageType,
      attachments: smallAttachments,
      binary_attachments: binaryAttachments,
    }),
  });

  return response.json();
};
