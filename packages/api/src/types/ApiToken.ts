import { ServerInfo } from "./generated/api-types";

export type ApiToken = {
  selfLocalIp: string;
  host: ServerInfo;
  deviceId: string;
  password?: string;
};
