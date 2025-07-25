import { Attachment } from '@sureshot/api';
import { sendMessage } from '@sureshot/api/src';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { Component, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { globalStore } from '~/store/GlobalStore';
import { readFileFromPath } from '~/utils/FileUtils';
import { useAuthRedirect } from '~/utils/useAuthRedirect';
import AttachmentList from './attachment/AttachmentList';
import { createAttachment } from './attachment/createAttachment';
import OptimizedAttachmentButton from './attachment/OptimizedAttachmentButton';

const MessageInput: Component = () => {
  let inputRef: HTMLInputElement;

  const [message, setMessage] = createSignal('');
  const [attachments, setAttachments] = createSignal<Attachment[]>([]);
  const [sendStatus, setSendStatus] = createSignal('');
  const [isSending, setIsSending] = createSignal(false);

  const { validateAuth } = useAuthRedirect();

  const handleSendMessage = async () => {
    await validateAuth('preserve');

    const msg = message().trim();
    const currentAttachments = attachments();

    if (!msg && currentAttachments.length === 0) {
      setSendStatus('❌ Message or attachments are required');
      return;
    }

    setIsSending(true);

    try {
      const result = await sendMessage(globalStore.deviceName || 'Unknown', globalStore.localIp || 'unknown', msg, 'text', currentAttachments);

      if (result.success) {
        setMessage(''); // メッセージフィールドをクリア
        setAttachments([]); // 添付ファイルをクリア
      } else {
        setSendStatus(`❌ Failed: ${result.message}`);
      }
    } catch (error) {
      setSendStatus(`❌ Error: ${error}`);
    } finally {
      setIsSending(false);
      // 3秒後にステータスメッセージをクリア
      setTimeout(() => setSendStatus(''), 3000);
    }

    inputRef?.focus();
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !isSending()) {
      handleSendMessage();
    }
  };

  const [dragState, setDragState] = createSignal<'over' | 'drop' | 'none'>('none');
  onMount(async () => {
    const unlisten = await getCurrentWebview().onDragDropEvent(async (event) => {
      if (event.payload.type === 'over') {
        setDragState('over');
        console.log('User hovering', event.payload.position);
      } else if (event.payload.type === 'drop') {
        setDragState('drop');
        console.log('User dropped', event.payload.paths);
        // User dropped (2)
        // ['C:\\Users\\n4505\\Pictures\\Screenshots\\スクリーンショット 2025-07-24 174924.png',
        //  'C:\\Users\\n4505\\Pictures\\Screenshots\\スクリーンショット 2025-07-24 174933.png']

        const filePromises: Promise<File | undefined>[] = event.payload.paths.map((path) => readFileFromPath(path));
        const resolvedFiles = await Promise.all(filePromises);
        const files: File[] = resolvedFiles.filter((file): file is File => file !== undefined);
        console.log(files);
        const newAttachments: Attachment[] = [];
        for (const file of files) {
          if (file) {
            newAttachments.push(await createAttachment(file));
          }
        }
        setAttachments([...attachments(), ...newAttachments]);
        setDragState('none');
      } else {
        setDragState('none');
        console.log('File drop cancelled');
      }
    });
    onCleanup(() => {
      unlisten();
    });
  });

  let fileInput: HTMLInputElement | undefined;
  const maxSizeForBase64 = 1024 * 1024; // 1MB

  const shouldUseBase64 = (file: File): boolean => {
    // 小さなファイルや特定のファイル形式はBase64を使用
    if (file.size <= maxSizeForBase64) return true;

    // 画像は表示のためBase64が便利
    if (file.type.startsWith('image/')) return true;

    // テキストファイルは可読性のためBase64
    if (file.type.startsWith('text/')) return true;

    return false;
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 'auto',
        display: 'flex',
        'flex-direction': 'column',
      }}
    >
      <div
        id='drop-zone'
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
          visibility: dragState() === 'over' ? 'visible' : 'hidden',
          'z-index': 100,
          'background-image':
            'linear-gradient(45deg, #00000040 16.67%, transparent 16.67%, transparent 50%, #00000040 50%, #00000040 66.67%, transparent 66.67%, transparent 100%)',
          'background-size': '6.97px 6.97px',
        }}
      />
      <div
        style={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          'flex-direction': 'column',
          'box-sizing': 'border-box',
        }}
      >
        {sendStatus() && (
          <div
            style={{
              position: 'absolute',
              top: '-0.5rem',
              left: '1rem',
              transform: 'translateY(-100%)',
              padding: '0.5rem',
              'border-radius': '4px',
              'background-color': sendStatus().includes('✅') ? '#d4edda' : sendStatus().includes('📤') ? '#f8f9fa' : '#f8d7da',
              color: sendStatus().includes('✅') ? '#155724' : sendStatus().includes('📤') ? '#6c757d' : '#721c24',
              'font-size': '12px',
            }}
          >
            {sendStatus()}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            'flex-direction': 'row',
            'align-items': 'center',
            height: '100%',
            padding: '0 0.25rem',
          }}
        >
          <div
            style={{
              'z-index': 101,
              filter:
                dragState() === 'over'
                  ? 'brightness(0) saturate(100%) invert(21%) sepia(92%) saturate(6174%) hue-rotate(356deg) brightness(93%) contrast(118%)'
                  : 'none',
            }}
          >
            <OptimizedAttachmentButton
              onAttachmentLoadStart={() => setSendStatus('📤 Loading attachments...')}
              onAttachmentLoad={(newAttachments) => setAttachments([...attachments(), ...newAttachments])}
              onAttachmentLoadEnd={() => setSendStatus('')}
              acceptedTypes='*/*'
              multiple={true}
            />
          </div>
          <label for='message' style={{ width: '100%', height: '100%', flex: 1, display: 'flex', 'flex-direction': 'row', 'align-items': 'center' }}>
            <input
              ref={(ref) => (inputRef = ref)}
              id='message'
              name='message'
              placeholder='Type your message...'
              value={message()}
              onInput={(e) => setMessage(e.currentTarget.value)}
              onKeyPress={handleKeyPress}
              style={{
                width: '100%',
                outline: 'none',
                border: 'none',
                'border-bottom': '1px solid #ccc',
                'padding-bottom': '4px',
                'margin-top': '2px',
              }}
              autocomplete='off'
              disabled={isSending()}
              onPaste={async (e) => {
                const { clipboardData } = e;
                if (!clipboardData) return;

                const pastedAttachments: Attachment[] = [];
                for (const file of Array.from(clipboardData.files)) {
                  if (file) {
                    pastedAttachments.push(await createAttachment(file));
                  }
                }

                setAttachments([...attachments(), ...pastedAttachments]);
              }}
            />
          </label>
          <button
            onClick={handleSendMessage}
            disabled={isSending() || (!message().trim() && attachments().length === 0)}
            style={{
              padding: '4px 16px',
              color: isSending() || (!message().trim() && attachments().length === 0) ? '#ccc' : '#248effff',
              'font-weight': 'bold',
              margin: '0.75rem',
              border: `1px solid ${isSending() || (!message().trim() && attachments().length === 0) ? '#ccc' : '#248effff'}`,
              cursor: isSending() ? 'not-allowed' : 'pointer',
            }}
          >
            {isSending() ? 'Sending...' : 'Send'}
          </button>
        </div>
        <Show when={attachments().length > 0}>
          <AttachmentList
            attachments={attachments()}
            onDeleteAttachment={(id) => {
              setAttachments(attachments().filter((attachment) => attachment.id !== id));
            }}
          />
        </Show>
      </div>
    </div>
  );
};

export default MessageInput;
