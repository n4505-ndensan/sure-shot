// Message APIs
export { getMessages } from "./api/messages/get";
export { sendMessage } from "./api/messages/send";

// Event Streaming APIs
export { useEventsSource } from "./api/events/useEventsSource";

// Authentication APIs
export { login, logout, getAuthStatus } from "./api/auth/login";
export { AuthManager } from "./auth/AuthManager";

export { type HostConnectionInfo } from "./types/Types";

// Re-export commonly used types from the generated API types
export type * from "./types/generated/api-types";
