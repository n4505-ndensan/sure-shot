import { Component } from 'solid-js';
import { ConnectionStatus } from './ConnectionStatus';

const HomeTitleBarContent: Component = () => {
  return (
    <div
      style={{
        'margin-right': '6px',
      }}
    >
      <ConnectionStatus />
    </div>
  );
};

export default HomeTitleBarContent;
