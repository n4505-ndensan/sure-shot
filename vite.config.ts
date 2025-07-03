import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    solidPlugin({ ssr: false }),
    nodePolyfills({
      protocolImports: true,
    }),
  ],
  server: {
    port: 3000,
    host: "192.168.5.3",
  },
  build: {
    target: "esnext",
  },
});
