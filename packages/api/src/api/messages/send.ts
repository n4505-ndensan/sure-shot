import { AuthManager } from "../../auth/AuthManager";
import {
  SendMessageResponse,
  Attachment,
} from "../../types/generated/api-types";

export const sendMessage = async (
  fromName: string,
  fromIp: string,
  message: string,
  messageType: string = "text",
  attachments: Attachment[] = []
): Promise<SendMessageResponse> => {
  try {
    const authManager = AuthManager.getInstance();

    if (!authManager.isAuthenticated()) {
      throw new Error("Not authenticated");
    }

    const sendUrl = `${authManager.getBaseUrl()}/send`;
    const response = await fetch(sendUrl, {
      method: "POST",
      headers: authManager.getAuthHeaders(),
      body: JSON.stringify({
        message: message,
        message_type: messageType,
        attachments: attachments,
        from_name: fromName,
        from_ip: fromIp,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: SendMessageResponse = await response.json();
    return result;
  } catch (error) {
    console.error("Failed to send message:", error);
    return {
      success: false,
      message: `Failed to send message: ${error}`,
      timestamp: new Date().toISOString(),
    };
  }
};
