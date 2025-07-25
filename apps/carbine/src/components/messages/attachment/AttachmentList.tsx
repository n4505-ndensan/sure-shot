import { Attachment } from '@sureshot/api';
import { Component, For, Show } from 'solid-js';

interface Props {
  attachments: Attachment[];
  onDeleteAttachment?: (id: string) => void;
}

const AttachmentList: Component<Props> = (props) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '12px', margin: '0px 12px 12px 12px' }}>
      <For each={props.attachments}>
        {(attachment) => (
          <div
            style={{
              position: 'relative',
              border: '1px solid #ddd',
              'border-radius': '8px',
              'background-color': '#f8f9fa',
              'max-width': '150px',
              overflow: 'hidden',
            }}
          >
            <Show when={attachment.mime_type.startsWith('image/')}>
              <img
                src={`data:${attachment.mime_type};base64,${attachment.data}`}
                alt={attachment.filename}
                style={{
                  width: '100%',
                  height: '100px',
                  'object-fit': 'cover',
                  'border-radius': '4px',
                  'margin-bottom': '4px',
                }}
              />
            </Show>

            <Show when={!attachment.mime_type.startsWith('image/')}>
              <div
                style={{
                  width: '100%',
                  height: '100px',
                  display: 'flex',
                  'align-items': 'center',
                  'justify-content': 'center',
                  'background-color': '#e9ecef',
                  'border-radius': '4px',
                  'margin-bottom': '4px',
                }}
              >
                <div style={{ 'text-align': 'center', overflow: 'hidden', 'text-overflow': 'ellipsis' }}>
                  <div style={{ 'font-size': '24px', 'margin-bottom': '4px' }}>📄</div>
                  <div style={{ 'font-size': '10px', 'font-weight': 'bold' }}>{attachment.filename.split('.').pop()?.toUpperCase()}</div>
                </div>
              </div>
            </Show>

            <div style={{ padding: '4px', overflow: 'hidden' }}>
              <p
                style={{
                  'font-size': '12px',
                  color: '#6c757d',
                  'font-weight': 'bold',
                  'margin-bottom': '2px',
                  overflow: 'hidden',
                  'white-space': 'nowrap',
                  'text-overflow': 'ellipsis',
                }}
              >
                {attachment.filename}
              </p>
              <p style={{ 'font-size': '8px', color: '#6c757d' }}>{formatFileSize(attachment.size)}</p>
            </div>

            <Show when={props.onDeleteAttachment}>
              <img
                src={'/remove.png'}
                width={16}
                height={16}
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  cursor: 'pointer',
                  'background-color': 'white',
                  'border-radius': '50%',
                  filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.2))',
                  padding: '4px',
                }}
                onClick={() => props.onDeleteAttachment?.(attachment.id)}
              />
            </Show>
          </div>
        )}
      </For>
    </div>
  );
};

export default AttachmentList;
