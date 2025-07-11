import { HostConnectionInfo, login } from "@sureshot/api/src";
import { getHostOrConnect } from "./hostApi";
import { setGlobalStore } from "~/store/GlobalStore";

export const tryLogin = async (
  deviceId: string,
  password: string
): Promise<boolean> => {
  const host = await getHostOrConnect();

  if (host) {
    // 認証トークンを作成
    const hostInfo: HostConnectionInfo = {
      host: host,
    };

    const authStatus = await login(hostInfo, deviceId, password);
    // ログイン
    console.log(authStatus);
    if (authStatus) {
      setGlobalStore("authStatus", authStatus);
      return true;
    }
  }
  setGlobalStore("authStatus", undefined);
  return false;
};
