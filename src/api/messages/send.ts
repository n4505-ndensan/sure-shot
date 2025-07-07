import {
  SendMessageResponse,
} from "../../types/generated/api-types";

export const sendMessage = async (
  targetIp: string,
  message: string,
  messageType: string = "text"
): Promise<SendMessageResponse> => {
  try {
    const response = await fetch("http://localhost:8000/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: targetIp,
        message: message,
        message_type: messageType,
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
