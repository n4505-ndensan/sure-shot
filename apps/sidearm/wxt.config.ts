import tsConfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-solid', '@wxt-dev/auto-icons'],

  manifest: {
    permissions: ['contextMenus', 'activeTab', 'storage'],
    // host_permissions: ['http://192.168.*:8000/*'],
  },
  autoIcons: {
    baseIconPath: './assets/icon.png',
    enabled: true,
    grayscaleOnDevelopment: true,
    sizes: [16, 24, 32, 48, 64, 96, 128],
  },

  vite: () => ({
    modules: [tsConfigPaths()],
    // CSS処理の最適化
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
          loadPaths: ['node_modules', '../../packages/ui/src'],
        },
      },
    },
  }),
});
