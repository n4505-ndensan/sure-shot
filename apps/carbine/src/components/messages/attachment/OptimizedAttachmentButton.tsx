import { Attachment } from '@sureshot/api';
import { Component } from 'solid-js';
import { createAttachment } from './createAttachment';

import '@styles/components/AttachmentButton.css';

interface Props {
  onAttachmentLoadStart?: () => void;
  onAttachmentLoad?: (attachments: Attachment[]) => void;
  onAttachmentLoadEnd?: () => void;
  acceptedTypes?: string;
  multiple?: boolean;
}

export const OptimizedAttachmentButton: Component<Props> = (props) => {
  let fileInput: HTMLInputElement | undefined;

  return (
    <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'center', margin: '0 16px' }}>
      <input
        ref={fileInput}
        type='file'
        style={{ display: 'none' }}
        multiple={props.multiple ?? true}
        accept={props.acceptedTypes ?? '*/*'}
        onChange={async (e) => {
          const files = e.currentTarget.files;
          if (files) {
            props.onAttachmentLoadStart?.();

            try {
              const attachments: Attachment[] = [];

              for (const file of Array.from(files)) {
                attachments.push(await createAttachment(file));
              }

              props.onAttachmentLoad?.(attachments);
              if (e.currentTarget) e.currentTarget.value = '';
            } catch (error) {
              console.error('Failed to process attachments:', error);
            } finally {
              props.onAttachmentLoadEnd?.();
            }
          }
        }}
      />
      <img
        class='icon'
        src={'/icons/clip_8.svg'}
        width={8}
        height={8}
        style={{
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          width: '16px',
          height: '16px',
          cursor: 'pointer',
          'pointer-events': 'all',
          'image-rendering': 'pixelated',
        }}
        onClick={() => {
          fileInput?.click();
        }}
      />
    </div>
  );
};

export default OptimizedAttachmentButton;
