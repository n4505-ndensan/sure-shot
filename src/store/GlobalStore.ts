import { createStore } from "solid-js/store";
import { ServerInfo } from "../types/generated/api-types";

type GlobalStore = {
  servers: ServerInfo[] | undefined;
  selectedTargetIp: string;
};

const [globalStore, setGlobalStore] = createStore<GlobalStore>({
  servers: [],
  selectedTargetIp: "",
});

export { globalStore, setGlobalStore };
