import { Component } from 'solid-js';

import './SidearmAnimLogo.css';

interface Props {
  scale?: number;
}

const SidearmAnimLogo: Component<Props> = (props) => {
  return (
    <div
      class={'sidearm_anim_logo_root'}
      style={{
        display: 'flex',
        position: 'relative',
        width: '160px',
        height: '160px',
        overflow: 'visible',
        scale: props.scale || 1,
      }}
    >
      <img class='flash' alt='flash' src='app_icon/flash.png' width={96} height={96} />

      <div class='cartridge' />

      <img class='sidearm_logo' alt='sidearm' src='app_icon/sidearm_160.png' width={160} height={160} />

      <img class='bullet' alt='bullet' src='app_icon/sureshot2_160.png' width={24} height={24} />

      <svg>
        <defs>
          <filter id='blur'>
            <feGaussianBlur in='SourceGraphic' stdDeviation='4 0' />
            <feMerge>
              <feMergeNode />
            </feMerge>
          </filter>
        </defs>
      </svg>
    </div>
  );
};

export default SidearmAnimLogo;
