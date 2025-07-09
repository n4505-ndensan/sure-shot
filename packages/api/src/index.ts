// Device Information APIs
export { getDeviceName } from "../../../apps/carbine/src/utils/getDeviceName";
export { getLocalIp } from "../../../apps/carbine/src/utils/getLocalIp";

// Host Management APIs
export { getCurrentHost, refreshHost, findHosts } from "./api/host/hostApi";
export type { ServerInfo } from "./api/host/hostApi";

// Message APIs
export { getMessages } from "./api/messages/get";
export { sendMessage } from "./api/messages/send";
export { sendMessageWithBinaryAttachments } from "./api/messages/binaryUpload";
export type {
  BinaryAttachment,
  SendMessageRequestV2,
} from "./api/messages/binaryUpload";

// Event Streaming APIs
export { useEventsSource } from "./api/events/useEventsSource";

// Re-export commonly used types from the generated API types
export type * from "./types/generated/api-types";
