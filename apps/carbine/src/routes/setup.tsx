import { Component, createSignal, onMount } from 'solid-js';

import '@styles/main.css';
import { CarbineAnimLogo, SidearmAnimLogo } from '@sureshot/ui/src';
import { getVersion } from '@tauri-apps/api/app';
import { useAuthRedirect } from '~/utils/useAuthRedirect';

const Setup: Component = () => {
  const { validateAuth } = useAuthRedirect('last-available');

  const [version, setVersion] = createSignal<string | null>(null);

  onMount(async () => {
    validateAuth('last-available');
    setVersion(await getVersion());
  });

  return (
    <div
      style={{
        display: 'flex',
        'flex-direction': 'row',
        height: '100%',
        width: '100%',
        gap: '20px',
        'box-sizing': 'border-box',
        'align-items': 'center',
        'justify-content': 'center',
        border: '1px solid #555',
      }}
    >
      {/* <img src='icon.png' alt='Setup Icon' width={50} height={50} />

      <div>
        <p style={{ 'font-size': '24px' }}>sure-shot</p>
        <p style={{ 'font-size': '12px' }}>carbine / {version()}</p>
      </div> */}
      {/* <CarbineAnimLogo scale={0.7} width={100} height={100} /> */}
      <SidearmAnimLogo scale={0.7} />
    </div>
  );
};

export default Setup;
