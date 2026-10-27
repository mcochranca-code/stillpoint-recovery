export type NotificationPermissionStatus = NotificationPermission | 'unsupported';

/** Optional contract a future native wrapper may expose to the embedded web app. */
export interface StillpointNotificationBridge {
  getPermission?(): Promise<NotificationPermissionStatus>;
  requestPermission(): Promise<NotificationPermissionStatus>;
}

declare global {
  interface Window {
    StillpointNotificationBridge?: StillpointNotificationBridge;
  }
}

function isPermissionStatus(value: unknown): value is NotificationPermissionStatus {
  return value === 'granted' || value === 'denied' || value === 'default' || value === 'unsupported';
}

/** Read current capability/permission without showing a browser or OS prompt. */
export async function getNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (typeof window === 'undefined') return 'unsupported';
  const nativeBridge = window.StillpointNotificationBridge;
  if (nativeBridge) {
    if (!nativeBridge.getPermission) return 'default';
    try {
      const result: unknown = await nativeBridge.getPermission();
      return isPermissionStatus(result) ? result : 'unsupported';
    } catch {
      return 'unsupported';
    }
  }
  if (!('Notification' in window)) return 'unsupported';
  return window.Notification.permission;
}

/** Call only from the explicit reminder opt-in event handler. */
export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (typeof window === 'undefined') return 'unsupported';
  const nativeBridge = window.StillpointNotificationBridge;
  if (nativeBridge) {
    try {
      const result: unknown = await nativeBridge.requestPermission();
      return isPermissionStatus(result) ? result : 'unsupported';
    } catch {
      return 'unsupported';
    }
  }
  if (!('Notification' in window)) return 'unsupported';
  const permission = window.Notification.permission;
  if (permission !== 'default') return permission;
  try {
    return await window.Notification.requestPermission();
  } catch {
    return 'denied';
  }
}
