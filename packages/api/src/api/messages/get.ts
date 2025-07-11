import { AuthManager } from "../../auth/AuthManager";
import { ReceivedMessage } from "../../types/generated/api-types";

export const getMessages = async (): Promise<ReceivedMessage[] | undefined> => {
  try {
    const authManager = AuthManager.getInstance();

    const getUrl = `${authManager.getBaseUrl()}/messages`;
    const response = await fetch(getUrl, {
      headers: authManager.getAuthHeaders(),
    });

    if (response.ok) {
      const pastMessages: ReceivedMessage[] = await response.json();
      return pastMessages;
    }
  } catch (error) {
    console.error("Failed to load past messages:", error);
  }

  return undefined;
};
