import { Component, createSignal, onMount } from 'solid-js';

import '@styles/main.css';
import { CarbineAnimLogo } from '@sureshot/ui/src';
import { getVersion } from '@tauri-apps/api/app';
import { useAuthRedirect } from '~/utils/useAuthRedirect';

const Setup: Component = () => {
  const { validateAuth } = useAuthRedirect();

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
      <div style={{ margin: '-60px', display: 'flex', 'align-items': 'center', 'justify-content': 'center' }}>
        <CarbineAnimLogo scale={0.3} />
      </div>
      {/* <img src='app_icon/sure_shot.svg' alt='Setup Icon' width={50} height={50} /> */}

      <div>
        <p style={{ 'font-size': '24px' }}>sure-shot</p>
        <p style={{ 'font-size': '12px', 'margin-bottom': '2px' }}>carbine / {version()}</p>
      </div>
    </div>
  );
};

export default Setup;
