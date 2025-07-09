import {
  SendMessageResponse,
  Attachment,
} from "../../types/generated/api-types";
import { getLocalIp } from "../getLocalIp";
import { getCurrentHost } from "../host/hostApi";

export const sendMessage = async (
  name: string,
  message: string,
  messageType: string = "text",
  attachments: Attachment[] = []
): Promise<SendMessageResponse> => {
  try {
    // 現在のホストを取得
    const currentHost = await getCurrentHost();
    if (!currentHost) {
      throw new Error("No host found. Please select a host first.");
    }

    // ローカルIPを取得
    const localIp = await getLocalIp();

    const sendUrl = `http://${currentHost.ip}:${currentHost.port}/send`;
    const response = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message,
        message_type: messageType,
        attachments: attachments,
        from_name: name,
        from_ip: localIp,
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
