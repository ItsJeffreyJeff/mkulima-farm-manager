import { useEffect, useState } from 'react';
import { IOS_TIP, promptInstall, useInstall } from './pwa';

const KEY = 'mkulima_install_dismissed';
const recentlyDismissed = () => { try { return Date.now() - Number(localStorage.getItem(KEY) || 0) < 14 * 86400000; } catch { return false; } };

// Install suggestion and offline notice, shown on top of every screen
export default function PwaBar() {
  const { canPrompt, ios, installed } = useInstall();
  const [hidden, setHidden] = useState(recentlyDismissed());
  const [online, setOnline] = useState(typeof navigator === 'undefined' || navigator.onLine !== false);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  const dismiss = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* ignore */ } setHidden(true); };
  const showInstall = !installed && !hidden && (canPrompt || ios);
  return (
    <>
      {!online && <div role="status" className="fixed top-0 inset-x-0 z-[60] bg-slate-900 text-white text-sm text-center py-1.5 px-3">You are offline. Screens you have opened before still work, but new records cannot be saved until you reconnect.</div>}
      {showInstall && (
        <div role="dialog" aria-label="Install app" className="no-print fixed bottom-20 md:bottom-4 left-3 right-3 md:left-auto md:right-4 md:w-96 z-40 bg-white border rounded-2xl shadow-xl p-4 flex gap-3">
          <img src="/icons/icon-192.png" alt="" className="w-12 h-12 rounded-xl border shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-black leading-tight">Install Mkulima Farm Manager</div>
            <p className="text-sm text-slate-600 mt-1">{canPrompt ? 'Add it to your home screen or desktop. It opens full screen, like a normal app.' : IOS_TIP}</p>
            <div className="flex gap-2 mt-3">
              {canPrompt && <button onClick={() => promptInstall()} className="bg-emerald-600 text-white rounded-xl px-4 py-2 text-sm font-bold">Install</button>}
              <button onClick={dismiss} className="border rounded-xl px-4 py-2 text-sm font-semibold">{canPrompt ? 'Not now' : 'Got it'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
