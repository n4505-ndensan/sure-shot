import { HostInfo, login } from '@sureshot/api/src';

export const tryLogin = async (host: HostInfo, deviceId: string, password: string, debugFn?: (message: string) => void): Promise<boolean> => {
  const log = debugFn || console.log;

  log(`tryLogin called with: host=${host.ip}:${host.port}, deviceId=${deviceId}, passwordLength=${password?.length}`);

  try {
    log('Using provided host connection...');
    log(`Host connection info: ${JSON.stringify(host)}`);

    log(`Attempting login with hostInfo: ${JSON.stringify({ host })}`);
    const authStatus = await login(host, deviceId, password, log);
    log(`Login API response: ${JSON.stringify(authStatus)}`);

    if (authStatus.isAuthenticated) {
      return true;
    } else {
      log('Login failed.');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`tryLogin error: ${errorMsg}`);
  }

  return false;
};
