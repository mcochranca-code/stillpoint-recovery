/**
 * Hold the browser's install prompt so Stillpoint can offer installation at a
 * meaningful moment instead of on first load. Purely local; nothing is logged.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function emit() { for (const listener of listeners) listener(); }

/** Start listening once, as early as possible (the event can fire before React mounts). */
export function captureInstallPrompt(target: Window = window): void {
  target.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit();
  });
  target.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emit();
  });
}

export function canPromptInstall(): boolean {
  return deferredPrompt !== null;
}

export function isRunningStandalone(): boolean {
  try {
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  } catch { /* Fall through. */ }
  return Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Show the browser's own install dialog. Returns the person's choice, or 'unavailable'. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const prompt = deferredPrompt;
  if (!prompt) return 'unavailable';
  deferredPrompt = null;
  emit();
  try {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    return choice.outcome;
  } catch {
    return 'dismissed';
  }
}

/** Test-only reset. */
export function __resetInstallPromptForTests(): void {
  deferredPrompt = null;
  listeners.clear();
}
