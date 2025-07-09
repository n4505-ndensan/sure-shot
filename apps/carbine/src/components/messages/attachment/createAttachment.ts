import { Attachment } from "@sureshot/api";
import { arrayBufferToBase64, getMimeType } from "../../../utils/FileUtils";
import { generateId } from "../../../utils/IdUtils";

export const createAttachment = async (file: File) => {
  const mimeType = getMimeType(file);
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

  return attachment;
};
