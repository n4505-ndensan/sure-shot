import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-solid", "@wxt-dev/auto-icons"],

  manifest: {
    permissions: ["contextMenus", "activeTab"],
    host_permissions: ["http://localhost:8000/*"],
  },

  autoIcons: {
    baseIconPath: "./assets/icon.png",
    enabled: true,
    grayscaleOnDevelopment: true,
    sizes: [16, 24, 32, 48, 64, 96, 128],
  },
});
