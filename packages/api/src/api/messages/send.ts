import { AuthManager } from '../../auth/AuthManager';
import { Attachment, SendMessageResponse } from '../../types/generated/api-types';
import { getAuthStatus } from '../auth/login';

export const sendMessage = async (
  fromName: string,
  fromIp: string,
  message: string,
  messageType: string = 'text',
  attachments: Attachment[] = []
): Promise<SendMessageResponse> => {
  try {
    const authManager = AuthManager.getInstance();
    console.log('send request from: ', getAuthStatus());
    const sendUrl = `${authManager.getBaseUrl()}/send`;
    console.log('send request to: ', sendUrl);
    const response = await fetch(sendUrl, {
      method: 'POST',
      headers: authManager.getAuthHeaders(),
      body: JSON.stringify({
        message: message,
        message_type: messageType,
        attachments: attachments,
        from_name: fromName,
        from_ip: fromIp,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: SendMessageResponse = await response.json();
    console.log(result);
    return result;
  } catch (error) {
    console.error('Failed to send message:', error);
    return {
      success: false,
      message: `Failed to send message: ${error}`,
      timestamp: new Date().toISOString(),
    };
  }
};
