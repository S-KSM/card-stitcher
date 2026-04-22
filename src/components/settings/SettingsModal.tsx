import { useEffect, useState } from 'react';
import { X, KeyRound, Wand2, ExternalLink } from 'lucide-react';
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
import {
  ENHANCE_BACKENDS,
  getEnhanceBackendId,
  setEnhanceBackendId,
  type EnhanceBackendId,
} from '../../lib/enhance';

interface Props {
  onClose: () => void;
}

export function SettingsModal({ onClose }: Props) {
  const [provider, setProviderState] = useState<ProviderId>(getProvider());
  const [key, setKey] = useState(getApiKey(provider));
  const [model, setModelValue] = useState(getModel(provider));
  const [enhanceBackend, setEnhanceBackendState] = useState<EnhanceBackendId>(
    getEnhanceBackendId(),
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setKey(getApiKey(provider));
    setModelValue(getModel(provider));
  }, [provider]);

  const save = () => {
    setProvider(provider);
    setApiKey(key, provider);
    setModel(model, provider);
    setEnhanceBackendId(enhanceBackend);
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound size={16} className="text-accent-primary" />
                <h3 className="font-medium text-[15px]">API key</h3>
              </div>
              <a
                href={meta.keyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[12px] text-accent-primary hover:underline"
              >
                Get key <ExternalLink size={12} />
              </a>
            </div>
            <input
              type="password"
              autoComplete="off"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={meta.keyHint}
              className="w-full px-3 py-2.5 rounded-[10px] border border-border-subtle bg-surface-card text-[15px] focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15 outline-none"
            />
            <p className="text-ink-muted text-[12px]">
              {provider === 'anthropic' && 'Create a key in Console → Settings → API keys. Needs a paid Anthropic account.'}
              {provider === 'openai' && 'Create a secret key at platform.openai.com. Image enhance (gpt-image-1) requires a verified organization.'}
              {provider === 'gemini' && 'Create a free key in Google AI Studio. Image enhance uses gemini-2.5-flash-image (paid tier).'}
            </p>
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

          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <Wand2 size={16} className="text-accent-primary" />
              <h3 className="font-medium text-[15px]">Enhance backend</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {ENHANCE_BACKENDS.map((b) => {
                const needsKey =
                  b.id === 'llm-gemini'
                    ? 'gemini'
                    : b.id === 'llm-openai'
                      ? 'openai'
                      : null;
                const keyMissing = needsKey ? !getApiKey(needsKey) : false;
                return (
                  <button
                    key={b.id}
                    onClick={() => setEnhanceBackendState(b.id)}
                    className={[
                      'px-3 py-2.5 rounded-[10px] border text-left text-[13px] transition',
                      enhanceBackend === b.id
                        ? 'bg-accent-primary text-white border-accent-primary'
                        : 'bg-surface-card text-ink-primary border-border-subtle hover:bg-bg-primary',
                    ].join(' ')}
                  >
                    <span className="block font-medium">{b.label}</span>
                    <span className={enhanceBackend === b.id ? 'text-white/80' : 'text-ink-muted'}>
                      {b.hint}
                    </span>
                    {needsKey && keyMissing && (
                      <span
                        className={[
                          'mt-1 block text-[11px] font-medium',
                          enhanceBackend === b.id ? 'text-white' : 'text-red-600',
                        ].join(' ')}
                      >
                        Needs a {needsKey === 'gemini' ? 'Google (Gemini)' : 'OpenAI'} API key above.
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
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
