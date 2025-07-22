import { platform } from '@tauri-apps/plugin-os';

export function isMobile(): boolean {
  const currentPlatform = platform();
  return currentPlatform === 'android' || currentPlatform === 'ios';
}
