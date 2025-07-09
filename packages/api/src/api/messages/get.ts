import { ReceivedMessage } from "../../types/generated/api-types";
import { getCurrentHost } from "../host/hostApi";

export const getMessages = async (): Promise<ReceivedMessage[] | undefined> => {
  try {
    // 現在のホストを取得
    const currentHost = await getCurrentHost();
    if (!currentHost) {
      throw new Error("No host found. Please select a host first.");
    }

    const getUrl = `http://${currentHost.ip}:${currentHost.port}/messages`;
    const response = await fetch(getUrl);
    if (response.ok) {
      const pastMessages: ReceivedMessage[] = await response.json();
      return pastMessages;
    }
  } catch (error) {
    console.error("Failed to load past messages:", error);
  }

  return undefined;
};
