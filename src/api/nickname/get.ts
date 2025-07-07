import { GetNicknameResponse } from "../../types/generated/api-types";

  // 現在のニックネームを取得
  export const getNickName = async (): Promise<string | undefined> => {
    try {
      const response = await fetch("http://localhost:8000/nickname");
      if (response.ok) {
        const data: GetNicknameResponse = await response.json();
        return data.nickname;
      }
    } catch (error) {
      console.error("Failed to load nickname:", error);
      return undefined;
    }
  };
