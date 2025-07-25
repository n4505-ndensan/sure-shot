import { makePersisted, storageSync } from '@solid-primitives/storage';
import { tauriStorage } from '@solid-primitives/storage/tauri';
import { createSignal } from 'solid-js';

const storage = window.__TAURI_OS_PLUGIN_INTERNALS__ ? tauriStorage() : localStorage;

export const [nickName, setNickName] = makePersisted(createSignal<string>('new device'), {
  name: 'nickName',
  storage: localStorage,
  sync: storageSync,
});
