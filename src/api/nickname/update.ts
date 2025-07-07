import {
  UpdateNicknameRequest,
  UpdateNicknameResponse,
} from "../../types/generated/api-types";
import { getNickName } from "./get";

// ニックネームを更新
export const updateNickname = async (
  newNickname: string,
  currentNickname: string
): Promise<boolean> => {
  if (!newNickname.trim()) {
    return false;
  }

  if (newNickname.trim() === currentNickname) {
    return false;
  }

  try {
    const request: UpdateNicknameRequest = {
      nickname: newNickname.trim(),
    };

    const response = await fetch("http://localhost:8000/update-nickname", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (response.ok) {
      const data: UpdateNicknameResponse = await response.json();
      if (data.success) {
        return true;
      }
    }
  } catch (error) {
    console.error("Failed to update nickname:", error);
  }

  return false;
};
