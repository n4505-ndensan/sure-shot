import { ReceivedMessage } from '@sureshot/api/src';
import { Component, For, Show } from 'solid-js';

interface Props {
  message: ReceivedMessage;
  isSelf?: boolean;
}

const MessageItem: Component<Props> = (props) => {
  const { message, isSelf = false } = props;

  // 時刻をフォーマット
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch {
      return timestamp;
    }
  };

  return (
    <div
      style={{
        padding: '0.5rem 0.75rem',
        margin: '8px 0',
        'background-color': isSelf ? '#e3f2fd' : '#f1f1f1',
        'border-radius': '4px',
        // 'border-left': isSelf ? '3px solid #2196f3' : '3px solid #4caf50',
        'margin-left': isSelf ? '40%' : '0',
        'margin-right': isSelf ? '0' : '40%',
      }}
    >
      <div
        style={{
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center',
          'margin-bottom': '0.25rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            'flex-direction': 'row',
            'align-items': 'baseline',
            gap: '0.25rem',
          }}
        >
          <strong
            style={{
              'font-size': '12px',
              color: isSelf ? '#1976d2' : '#495057',
            }}
          >
            {message.from_name}
            {isSelf ? ' [You]' : ''}
            {/* {message.from_name} */}
          </strong>
          <div
            style={{
              'font-size': '10px',
              color: '#6c757d',
              'margin-bottom': '0.25rem',
            }}
          >
            ({message.from})
          </div>
        </div>
        <span style={{ 'font-size': '10px', color: '#6c757d' }}>{formatTime(message.timestamp)}</span>
      </div>
      <div
        style={{
          'font-size': '12px',
          color: '#212529',
          'font-weight': isSelf ? '500' : 'normal',
        }}
      >
        {/* メッセージテキスト */}
        <Show when={message.message.trim()}>
          <div>
            <p>{message.message}</p>
          </div>
        </Show>

        {/* 添付ファイル */}
        <Show when={message.attachments && message.attachments.length > 0}>
          <div
            style={{
              display: 'flex',
              'flex-wrap': 'wrap',
              gap: '0.5rem',
              'margin-top': '0.5rem',
            }}
          >
            <For each={message.attachments}>
              {(attachment) => (
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    display: 'flex',
                    gap: '1px',
                    'margin-bottom': '3px',
                    'flex-direction': 'column',
                  }}
                >
                  <Show when={attachment.mime_type.startsWith('image/')}>
                    <img
                      src={`data:${attachment.mime_type};base64,${attachment.data}`}
                      alt={attachment.filename}
                      style={{
                        width: 'fit-content',
                        height: '200px',
                        'border-radius': '4px',
                        'object-fit': 'contain',
                      }}
                    />
                    <p
                      style={{
                        'margin-right': !isSelf ? 'auto' : '0',
                        'margin-left': isSelf ? 'auto' : '0',
                      }}
                    >
                      {/* <span
                                style={{
                                  "font-size": "9px",
                                  "text-decoration": "underline",
                                }}
                              >
                                ↓
                              </span> */}
                      <a
                        style={{
                          'font-size': '9px',
                          width: 'auto',
                          // "margin-left": "0.25rem",
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          // if (isSelf) return;
                          const link = document.createElement('a');
                          const href = `data:${attachment.mime_type};base64,${attachment.data}`;
                          link.href = href;
                          link.download = attachment.filename;
                          link.click();
                        }}
                      >
                        {attachment.filename} ({(attachment.size / 1024).toFixed(1)} KB)
                      </a>
                    </p>
                  </Show>
                  <Show when={!attachment.mime_type.startsWith('image/')}>
                    <div
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #ccc',
                        'border-radius': '4px',
                        'background-color': '#f8f9fa',
                        width: '100%',
                        gap: '8px',
                        'box-sizing': 'border-box',
                      }}
                    >
                      <a
                        style={{
                          'font-size': '12px',
                          'font-weight': 'bold',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          // if (isSelf) return;
                          const link = document.createElement('a');
                          link.href = `data:${attachment.mime_type};base64,${attachment.data}`;
                          link.download = attachment.filename;
                          link.click();
                        }}
                      >
                        {attachment.filename}
                      </a>
                      <div
                        style={{
                          'font-size': '10px',
                          color: '#6c757d',
                        }}
                      >
                        {attachment.mime_type} | {(attachment.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default MessageItem;
