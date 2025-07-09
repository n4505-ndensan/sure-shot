import { createStore } from "solid-js/store";

type GlobalStore = {
  localIp?: string; // 自分のIPアドレス
  deviceName?: string; // 自分のデバイス名
};

const [globalStore, setGlobalStore] = createStore<GlobalStore>({
  localIp: undefined,
  deviceName: undefined,
});

export { globalStore, setGlobalStore };
