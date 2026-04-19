import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'cs:install-dismissed';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window);
}

export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSTip, setShowIOSTip] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === '1',
  );

  useEffect(() => {
    if (isStandalone() || dismissed) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, [dismissed]);

  useEffect(() => {
    const onInstalled = () => {
      setEvt(null);
      setShowIOSTip(false);
    };
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  if (isStandalone() || dismissed) return null;

  const canNativeInstall = evt !== null;
  const canIOSInstall = !canNativeInstall && isIOS();
  if (!canNativeInstall && !canIOSInstall) return null;

  const install = async () => {
    if (canNativeInstall && evt) {
      await evt.prompt();
      const { outcome } = await evt.userChoice;
      if (outcome === 'accepted') setEvt(null);
      return;
    }
    if (canIOSInstall) setShowIOSTip(true);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  return (
    <>
      <button
        onClick={install}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-medium text-accent-primary border border-accent-primary/40 hover:bg-accent-primary/10 transition"
      >
        <Download size={14} />
        Install app
      </button>

      {showIOSTip && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-surface-card rounded-card shadow-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-display text-[20px]">Install on iPhone</h3>
              <button
                onClick={() => setShowIOSTip(false)}
                className="p-1.5 rounded-full hover:bg-black/5"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <ol className="space-y-3 text-[14px]">
              <li className="flex items-start gap-2">
                <span className="w-6 h-6 rounded-full bg-accent-primary text-white text-[12px] font-bold grid place-items-center shrink-0">1</span>
                <span>
                  Tap the <span className="inline-flex items-center gap-1 align-middle"><Share size={14} /> Share</span> icon in Safari's toolbar.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-6 h-6 rounded-full bg-accent-primary text-white text-[12px] font-bold grid place-items-center shrink-0">2</span>
                <span>Scroll and pick <b>Add to Home Screen</b>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-6 h-6 rounded-full bg-accent-primary text-white text-[12px] font-bold grid place-items-center shrink-0">3</span>
                <span>Tap <b>Add</b>. Card Stitcher now lives on your Home Screen.</span>
              </li>
            </ol>
            <button
              onClick={dismiss}
              className="mt-5 w-full text-[13px] text-ink-muted hover:text-ink-primary"
            >
              Don't show again
            </button>
          </div>
        </div>
      )}
    </>
  );
}
