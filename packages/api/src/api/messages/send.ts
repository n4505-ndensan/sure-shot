import {
  SendMessageResponse,
  Attachment,
} from "../../types/generated/api-types";
import { getCurrentHost, ServerInfo } from "../host/hostApi";

export const sendMessage = async (
  fromName: string,
  fromIp: string,
  message: string,
  messageType: string = "text",
  attachments: Attachment[] = [],
  currentHost?: {
    ip: string;
    port: number;
  } | null
): Promise<SendMessageResponse> => {
  try {
    // 現在のホストを取得
    if (!currentHost) {
      currentHost = await getCurrentHost();
      if (!currentHost) {
        throw new Error("No current host found. Please set up a host first.");
      }
    }
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
