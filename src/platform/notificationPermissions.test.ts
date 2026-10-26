import { afterEach, describe, expect, it, vi } from 'vitest';
import { getNotificationPermission, requestNotificationPermission } from './notificationPermissions';

const originalNotification = Object.getOwnPropertyDescriptor(window, 'Notification');

afterEach(() => {
  if (originalNotification) Object.defineProperty(window, 'Notification', originalNotification);
  else Reflect.deleteProperty(window, 'Notification');
  Reflect.deleteProperty(window, 'StillpointNotificationBridge');
  vi.restoreAllMocks();
});

function installBrowserNotification(permission: NotificationPermission, requestPermission: () => Promise<NotificationPermission>) {
  Object.defineProperty(window, 'Notification', {
    configurable: true,
    value: { permission, requestPermission },
  });
}

describe('notification permission adapter', () => {
  it('reads browser permission without prompting', async () => {
    const requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
    installBrowserNotification('default', requestPermission);

    await expect(getNotificationPermission()).resolves.toBe('default');
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('requests browser permission only when the explicit opt-in helper is called', async () => {
    const requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
    installBrowserNotification('default', requestPermission);

    await expect(requestNotificationPermission()).resolves.toBe('granted');
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it('does not repeat a browser prompt after permission is already denied', async () => {
    const requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
    installBrowserNotification('denied', requestPermission);

    await expect(requestNotificationPermission()).resolves.toBe('denied');
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('uses an explicit native host permission bridge when present', async () => {
    const requestPermission = vi.fn(async () => 'granted' as const);
    window.StillpointNotificationBridge = {
      getPermission: async () => 'default',
      requestPermission,
    };

    await expect(getNotificationPermission()).resolves.toBe('default');
    expect(requestPermission).not.toHaveBeenCalled();
    await expect(requestNotificationPermission()).resolves.toBe('granted');
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it('keeps a request-only native bridge available for an explicit opt-in', async () => {
    const requestPermission = vi.fn(async () => 'granted' as const);
    window.StillpointNotificationBridge = { requestPermission };

    await expect(getNotificationPermission()).resolves.toBe('default');
    await expect(requestNotificationPermission()).resolves.toBe('granted');
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it('returns unsupported when neither a native bridge nor browser Notification exists', async () => {
    Reflect.deleteProperty(window, 'Notification');

    await expect(getNotificationPermission()).resolves.toBe('unsupported');
    await expect(requestNotificationPermission()).resolves.toBe('unsupported');
  });
});
