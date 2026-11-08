import { afterEach, describe, expect, it, vi } from 'vitest';
import { __resetInstallPromptForTests, canPromptInstall, captureInstallPrompt, promptInstall, subscribeInstallPrompt } from './installPrompt';
import { clearAllLocalSignals, LOCAL_SIGNAL_KEYS, readLocalSignal, writeLocalSignal } from './localSignals';

afterEach(() => { __resetInstallPromptForTests(); window.localStorage.clear(); });

function installEvent(outcome: 'accepted' | 'dismissed') {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

describe('deferred install prompt', () => {
  it('holds the browser prompt instead of showing it on first load, then shows it on request', async () => {
    const target = new EventTarget() as unknown as Window;
    captureInstallPrompt(target);
    const listener = vi.fn();
    subscribeInstallPrompt(listener);
    expect(canPromptInstall()).toBe(false);

    const event = installEvent('accepted');
    target.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(canPromptInstall()).toBe(true);
    expect(listener).toHaveBeenCalled();

    await expect(promptInstall()).resolves.toBe('accepted');
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(canPromptInstall()).toBe(false);
    await expect(promptInstall()).resolves.toBe('unavailable');
  });

  it('forgets the prompt once the app is installed', () => {
    const target = new EventTarget() as unknown as Window;
    captureInstallPrompt(target);
    target.dispatchEvent(installEvent('dismissed'));
    target.dispatchEvent(new Event('appinstalled'));
    expect(canPromptInstall()).toBe(false);
  });
});

describe('on-device engagement markers', () => {
  it('reads, writes and clears only namespaced local keys', () => {
    writeLocalSignal('lastBackupAt', '2026-11-06T12:00:00.000Z');
    expect(window.localStorage.getItem(LOCAL_SIGNAL_KEYS.lastBackupAt)).toBe('2026-11-06T12:00:00.000Z');
    expect(readLocalSignal('lastBackupAt')).toBe('2026-11-06T12:00:00.000Z');
    window.localStorage.setItem('unrelated', 'kept');
    clearAllLocalSignals();
    expect(readLocalSignal('lastBackupAt')).toBeNull();
    expect(window.localStorage.getItem('unrelated')).toBe('kept');
  });
});
