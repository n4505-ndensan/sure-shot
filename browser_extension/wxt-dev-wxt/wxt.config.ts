import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-solid"],
  manifest: {
    permissions: ["contextMenus", "activeTab"],
    host_permissions: ["http://localhost:8000/*"],
  },
});
