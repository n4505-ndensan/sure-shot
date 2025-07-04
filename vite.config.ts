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
    host: "localhost",
  },
  build: {
    target: "esnext",
  },
});
