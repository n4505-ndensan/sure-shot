import { HostConnectionInfo, HostInfo, login } from "@sureshot/api/src";
import { setGlobalStore } from "~/store/GlobalStore";

export const tryLogin = async (
  host: HostInfo,
  deviceId: string,
  password: string,
  debugFn?: (message: string) => void
): Promise<boolean> => {
  const log = debugFn || console.log;

  log(
    `tryLogin called with: host=${host.ip}:${host.port}, deviceId=${deviceId}, passwordLength=${password?.length}`
  );

  try {
    log("Using provided host connection...");
    log(`Host connection info: ${JSON.stringify(host)}`);

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
    } else {
      log("Login failed: no auth status returned");
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`tryLogin error: ${errorMsg}`);
  }

  setGlobalStore("authStatus", undefined);
  return false;
};
