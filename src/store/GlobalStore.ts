import { createStore } from "solid-js/store";

type GlobalStore = {
  ports: any[];
};

const [globalStore, setGlobalStore] = createStore<GlobalStore>({
  ports: [],
});

export { globalStore, setGlobalStore };
