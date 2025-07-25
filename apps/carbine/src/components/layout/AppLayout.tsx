import { Component, JSX } from 'solid-js';
import TitleBar from './TitleBar';

interface AppLayoutProps {
  showConnectionStatus?: boolean;
  children: JSX.Element;
}

import '../../styles/main.css';

const AppLayout: Component<AppLayoutProps> = (props) => {
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        'flex-direction': 'column',
        'box-sizing': 'border-box',
      }}
    >
      <TitleBar />
      {/* <AppHeader showConnectionStatus={props.showConnectionStatus} /> */}

      <main>{props.children}</main>
    </div>
  );
};

export default AppLayout;
