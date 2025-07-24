import { Component } from 'solid-js';

import './CarbineAnimLogo.css';

const CarbineAnimLogo: Component<{scale?: number}> = (props) => {
  return (
    <div
      class={'carbine_anim_logo_root'}
      style={{
        display: 'flex',
        position: 'relative',
        width: '160px',
        height: '160px',
        overflow: 'visible',
        scale: props.scale || 1,
      }}
    >
      <div class='cartridge1' />
      <div class='cartridge2' />
      <div class='cartridge3' />

      <img class='flash1' alt='flash' src='app_icon/flash.png' width={96} height={96} />
      <img class='flash2' alt='flash' src='app_icon/flash.png' width={96} height={96} />
      <img class='flash3' alt='flash' src='app_icon/flash.png' width={96} height={96} />

      <img class='carbine_logo' alt='carbine' src='app_icon/carbine_160.png' width={160} height={160} />

      <img class='bullet1' alt='bullet1' src='app_icon/sureshot2_160.png' width={16} height={16} />
      <img class='bullet2' alt='bullet2' src='app_icon/sureshot2_160.png' width={16} height={16} />
      <img class='bullet3' alt='bullet3' src='app_icon/sureshot2_160.png' width={16} height={16} />

      <svg width={1} height={1}>
        <defs>
          <filter id='blur'>
            <feGaussianBlur in='SourceGraphic' stdDeviation='6 0' />
            <feMerge>
              <feMergeNode />
              <feMergeNode in='SourceGraphic' />
            </feMerge>
          </filter>
        </defs>
      </svg>
    </div>
  );
};

export default CarbineAnimLogo;
