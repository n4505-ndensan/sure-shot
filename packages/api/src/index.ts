// Message APIs
export { getMessages } from './api/messages/get';
export { sendMessage } from './api/messages/send';

// Event Streaming APIs
export { useEventsSource } from './api/events/useEventsSource';

// Authentication APIs
export { getAuthStatus, login, logout } from './api/auth/login';
export { AuthManager, type AuthCredentials, type AuthError, type AuthStatus } from './auth/AuthManager';

// Re-export commonly used types from the generated API types
export type * from './types/generated/api-types';
