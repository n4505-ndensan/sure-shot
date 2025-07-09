import { createStore } from "solid-js/store";

type GlobalStore = {
  localIp?: string; // 自分のIPアドレス
};

const [globalStore, setGlobalStore] = createStore<GlobalStore>({
  localIp: undefined,
});

export { globalStore, setGlobalStore };
