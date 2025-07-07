import { ReceivedMessage } from "../../types/generated/api-types";

export const getMessages = async (): Promise<ReceivedMessage[] | undefined> => {
  try {
    const response = await fetch("http://localhost:8000/messages");
    if (response.ok) {
      const pastMessages: ReceivedMessage[] = await response.json();
      return pastMessages;
    }
  } catch (error) {
    console.error("Failed to load past messages:", error);
  }

  return undefined;
};
