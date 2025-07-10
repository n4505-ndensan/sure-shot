import { ApiToken, login } from "@sureshot/api/src";
import { getHostOrConnect } from "./hostApi";
import { getLocalIp } from "./getLocalIp";
import { setGlobalStore } from "~/store/GlobalStore";

export const tryLogin = async (
  deviceId: string,
  password: string
): Promise<boolean> => {
  const localIp = await getLocalIp();
  const host = await getHostOrConnect();

  if (host) {
    // 認証トークンを作成
    const apiToken: ApiToken = {
      selfLocalIp: localIp,
      deviceId: deviceId,
      host: host,
      password: password,
    };

    const authenticated = await login(apiToken);
    // ログイン
    console.log(authenticated);
    if (authenticated) {
      setGlobalStore("authStatus", "authenticated");
      return true;
    }
  }
  setGlobalStore("authStatus", "error");
  return false;
};
