import { fallBackMimeType, mimeTypes } from "../components/messages/attachment/MimeTypes";

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  var binary = "";
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export const getMimeType = (file: File): string => {
  // ブラウザが検出したMIMEタイプを優先
  if (file.type) {
    return file.type;
  }

  // フォールバック: 拡張子ベースの検出
  const extension = file.name.split(".").pop()?.toLowerCase();
  return mimeTypes[extension || ""] || fallBackMimeType;
};
