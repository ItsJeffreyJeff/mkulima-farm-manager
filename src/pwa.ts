import { useSyncExternalStore } from 'react';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: InstallEvent | null = null;
let installed = false;
const subs = new Set<() => void>();
const notify = () => { snapshotCache = null; subs.forEach(f => f()); };
let snapshotCache: string | null = null;

export const isStandalone = () =>
  typeof window !== 'undefined' && (!!window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true);
export const isIOS = () =>
  typeof navigator !== 'undefined' && (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

// Call once at start-up: the browser can announce "installable" before the screen has drawn
export function initPwa() {
  if (typeof window === 'undefined') return;
  installed = isStandalone();
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e as InstallEvent; notify(); });
  window.addEventListener('appinstalled', () => { deferred = null; installed = true; notify(); });
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
  }
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const d = deferred;
  deferred = null; notify();
  await d.prompt();
  const choice = await d.userChoice;
  if (choice.outcome === 'accepted') { installed = true; notify(); }
  return choice.outcome === 'accepted';
}

const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const snapshot = () => (snapshotCache ??= JSON.stringify({ canPrompt: !!deferred, ios: isIOS() && !isStandalone() && !installed, installed: installed || isStandalone() }));
export function useInstall(): { canPrompt: boolean; ios: boolean; installed: boolean } {
  return JSON.parse(useSyncExternalStore(subscribe, snapshot, snapshot));
}
export const IOS_TIP = 'On iPhone or iPad: open this site in Safari, tap the Share button, then choose “Add to Home Screen”.';
