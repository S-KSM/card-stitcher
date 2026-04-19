import { useEffect, useState } from 'react';
import { X, KeyRound } from 'lucide-react';
import { Button } from '../ui/Button';
import {
  getApiKey,
  setApiKey,
  getModel,
  setModel,
  getProvider,
  setProvider,
  PROVIDERS,
  DEFAULT_MODEL,
  type ProviderId,
} from '../../lib/ai';

interface Props {
  onClose: () => void;
}

export function SettingsModal({ onClose }: Props) {
  const [provider, setProviderState] = useState<ProviderId>(getProvider());
  const [key, setKey] = useState(getApiKey(provider));
  const [model, setModelValue] = useState(getModel(provider));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setKey(getApiKey(provider));
    setModelValue(getModel(provider));
  }, [provider]);

  const save = () => {
    setProvider(provider);
    setApiKey(key, provider);
    setModel(model, provider);
    setSaved(true);
    setTimeout(onClose, 600);
  };

  const clearKey = () => {
    setApiKey('', provider);
    setKey('');
    setSaved(true);
    setTimeout(() => setSaved(false), 800);
  };

  const meta = PROVIDERS.find((p) => p.id === provider)!;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div
        className="w-full max-w-md bg-surface-card rounded-card shadow-xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between px-5 pt-5 pb-2">
          <h2 className="font-display text-[22px]">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="px-5 pb-5 space-y-5">
          <section className="space-y-2">
            <h3 className="font-medium text-[15px]">AI provider</h3>
            <div className="grid grid-cols-3 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProviderState(p.id)}
                  className={[
                    'px-2 py-2.5 rounded-[10px] border text-[13px] font-medium transition text-center',
                    provider === p.id
                      ? 'bg-accent-primary text-white border-accent-primary'
                      : 'bg-surface-card text-ink-primary border-border-subtle hover:bg-bg-primary',
                  ].join(' ')}
                >
                  {p.label.split(' ')[0]}
                </button>
              ))}
            </div>
            <p className="text-ink-muted text-[12px]">
              {meta.label}. Keys stay in this browser only — nothing is proxied through our servers.
            </p>
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <KeyRound size={16} className="text-accent-primary" />
              <h3 className="font-medium text-[15px]">API key</h3>
            </div>
            <input
              type="password"
              autoComplete="off"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={meta.keyHint}
              className="w-full px-3 py-2.5 rounded-[10px] border border-border-subtle bg-surface-card text-[15px] focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15 outline-none"
            />
          </section>

          <section className="space-y-2">
            <h3 className="font-medium text-[15px]">Model</h3>
            <input
              type="text"
              value={model}
              onChange={(e) => setModelValue(e.target.value)}
              placeholder={DEFAULT_MODEL[provider]}
              className="w-full px-3 py-2.5 rounded-[10px] border border-border-subtle bg-surface-card text-[15px] focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15 outline-none"
            />
            <p className="text-ink-muted text-[12px]">
              Default: {DEFAULT_MODEL[provider]}.
            </p>
          </section>

          {saved && <p className="text-[12px] text-green-700">Saved.</p>}

          <div className="flex gap-2">
            <Button variant="secondary" onClick={clearKey} className="flex-1">
              Clear key
            </Button>
            <Button onClick={save} className="flex-1">
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
