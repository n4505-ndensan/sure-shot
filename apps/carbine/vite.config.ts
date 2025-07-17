import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tsConfigPaths from "vite-tsconfig-paths";

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [solid(), tsConfigPaths()],

  // CSS処理の最適化
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
        loadPaths: ["node_modules", "../../packages/ui/src"],
      },
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  resolve: {
    alias: {
      "@styles": "/src/styles",
      "@styles/": "/src/styles/",
    },
  },
});
