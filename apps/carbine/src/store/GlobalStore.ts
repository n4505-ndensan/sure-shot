
import { AuthStatus } from "@sureshot/api/src/auth/AuthManager";
import { createStore } from "solid-js/store";

type GlobalStore = {
  localIp?: string; // 自分のIPアドレス
  deviceName?: string; // 自分のデバイス名
  authStatus?: AuthStatus; // 認証状態
};

const [globalStore, setGlobalStore] = createStore<GlobalStore>({
  localIp: undefined,
  deviceName: undefined,
  authStatus: undefined,
});

export { globalStore, setGlobalStore };
