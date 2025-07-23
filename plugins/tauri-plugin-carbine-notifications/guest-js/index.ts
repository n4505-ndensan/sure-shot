import { invoke } from '@tauri-apps/api/core';

export interface StartServiceRequest {
  serverUrl: string;
}

export interface ServiceStatusResponse {
  isRunning: boolean;
  lastCheck?: string;
  messageCount: number;
  errorMessage?: string;
}

export interface StopServiceRequest {}

export interface StopServiceResponse {
  success: boolean;
}

/**
 * バックグラウンド通知サービスを開始します
 * Android専用機能です
 */
export async function startBackgroundService(payload: StartServiceRequest): Promise<ServiceStatusResponse> {
  return await invoke<ServiceStatusResponse>('plugin:carbine-notifications|start_background_service', { payload });
}

/**
 * バックグラウンド通知サービスを停止します
 * Android専用機能です
 */
export async function stopBackgroundService(): Promise<StopServiceResponse> {
  return await invoke<StopServiceResponse>('plugin:carbine-notifications|stop_background_service', { payload: {} });
}

/**
 * バックグラウンド通知サービスの状態を取得します
 * Android専用機能です
 */
export async function getServiceStatus(): Promise<ServiceStatusResponse> {
  return await invoke<ServiceStatusResponse>('plugin:carbine-notifications|get_service_status');
}
