import { HostConnectionInfo, login } from "@sureshot/api/src";
import { getHostOrConnect } from "./hostApi";
import { setGlobalStore } from "~/store/GlobalStore";

export const tryLogin = async (
  deviceId: string,
  password: string,
  debugFn?: (message: string) => void
): Promise<boolean> => {
  const log = debugFn || console.log;

  log(
    `tryLogin called with: deviceId=${deviceId}, passwordLength=${password?.length}`
  );

  try {
    log("Getting host connection...");
    const host = await getHostOrConnect();
    log(`Host connection result: ${JSON.stringify(host)}`);

    if (host) {
      // 認証トークンを作成
      const hostInfo: HostConnectionInfo = {
        host: host,
      };

      log(`Attempting login with hostInfo: ${JSON.stringify(hostInfo)}`);
      const authStatus = await login(hostInfo, deviceId, password, log);
      log(`Login API response: ${JSON.stringify(authStatus)}`);

      if (authStatus) {
        setGlobalStore("authStatus", authStatus);
        return true;
      }
    } else {
      log("No host available for login");
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`tryLogin error: ${errorMsg}`);
  }

  setGlobalStore("authStatus", undefined);
  return false;
};
