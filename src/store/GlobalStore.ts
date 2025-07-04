import { createStore } from "solid-js/store";
import { ServerInfo } from "../types/generated/api-types";

type GlobalStore = {
  ports: ServerInfo[];
};

const [globalStore, setGlobalStore] = createStore<GlobalStore>({
  ports: [],
});

export { globalStore, setGlobalStore };
