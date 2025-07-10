import { ApiToken } from "@sureshot/api/src";
import { createStore } from "solid-js/store";

type GlobalStore = {
  localIp?: string; // 自分のIPアドレス
  deviceName?: string; // 自分のデバイス名
  authStatus: "init" | "authenticated" | "error"; // 認証状態
};

const [globalStore, setGlobalStore] = createStore<GlobalStore>({
  localIp: undefined,
  deviceName: undefined,
  authStatus: "init",
});

export { globalStore, setGlobalStore };
