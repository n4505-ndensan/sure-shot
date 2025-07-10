// Message APIs
export { getMessages } from "./api/messages/get";
export { sendMessage } from "./api/messages/send";

// Event Streaming APIs
export { useEventsSource } from "./api/events/useEventsSource";

// Authentication APIs
export {
  login,
  logout,
  isAuthenticated,
  type AuthStatus,
  getAuthStatus,
} from "./api/auth/login";
export { AuthManager } from "./auth/AuthManager";

export { type ApiToken } from "./types/ApiToken";

// Re-export commonly used types from the generated API types
export type * from "./types/generated/api-types";
