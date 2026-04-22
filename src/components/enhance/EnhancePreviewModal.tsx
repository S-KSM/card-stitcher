import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, RotateCcw, Scissors, Sparkles, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { ManualQuadEditor } from './ManualQuadEditor';
import { useEditorStore } from '../../store/useEditorStore';
import { useEnhanceStore } from '../../store/useEnhanceStore';
import {
  ENHANCE_BACKENDS,
  enhancePage,
  getEnhanceBackendId,
  isLlmBackend,
  type EnhanceResult,
  type Quad,
} from '../../lib/enhance';
import { getBlob } from '../../lib/db';
import { blobUrl } from '../../lib/imageUtils';
import { defaultInsetQuad } from '../../lib/enhance/geometry';

interface Props {
  pageId: string;
  onClose: () => void;
}

type Mode = 'auto' | 'manual';

export function EnhancePreviewModal({ pageId, onClose }: Props) {
  const page = useEditorStore((s) => s.pages[pageId]);
  const applyEnhance = useEditorStore((s) => s.applyEnhance);
  const setStatus = useEnhanceStore((s) => s.setStatus);
  const clearStatus = useEnhanceStore((s) => s.clear);

  const [mode, setMode] = useState<Mode>('auto');
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [manualQuad, setManualQuad] = useState<Quad | null>(null);
  const [result, setResult] = useState<EnhanceResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const elapsedTimer = useRef<number | null>(null);

  useEffect(() => {
    if (running) {
      setElapsed(0);
      elapsedTimer.current = window.setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    } else if (elapsedTimer.current) {
      window.clearInterval(elapsedTimer.current);
      elapsedTimer.current = null;
    }
    return () => {
      if (elapsedTimer.current) window.clearInterval(elapsedTimer.current);
    };
  }, [running]);

  const originalKey = page?.originalBlobKey ?? page?.blobKey ?? null;

  useEffect(() => {
    if (!originalKey) return;
    (async () => {
      const b = await getBlob(originalKey);
      if (!b) return;
      setOriginalUrl(blobUrl(originalKey, b));
      const bitmap = await createImageBitmap(b);
      setImageSize({ width: bitmap.width, height: bitmap.height });
      bitmap.close?.();
    })();
  }, [originalKey]);

  const runAuto = useMemo(
    () => async () => {
      if (!page) return;
      setRunning(true);
      setError(null);
      setStatus(pageId, { kind: 'running' });
      try {
        const source = {
          ...page,
          blobKey: page.originalBlobKey ?? page.blobKey,
        };
        const r = await enhancePage(source, { outputFormat: 'jpeg' });
        setResult(r);
        if (!r.success) {
          // LLM backends own their geometry — no manual-corner fallback for them.
          if (!isLlmBackend(getEnhanceBackendId())) {
            setMode('manual');
            if (imageSize) {
              setManualQuad(defaultInsetQuad(imageSize.width, imageSize.height));
            }
          }
        } else if (r.page.enhancedBlobKey) {
          const blob = await getBlob(r.page.enhancedBlobKey);
          if (blob) setPreviewUrl(blobUrl(r.page.enhancedBlobKey, blob));
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setRunning(false);
        clearStatus(pageId);
      }
    },
    [page, pageId, imageSize, setStatus, clearStatus],
  );

  useEffect(() => {
    if (mode === 'auto' && !result && !running && page && imageSize) {
      runAuto();
    }
  }, [mode, result, running, page, imageSize, runAuto]);

  const runManual = async () => {
    if (!page || !manualQuad) return;
    setRunning(true);
    setError(null);
    setStatus(pageId, { kind: 'running' });
    try {
      const source = {
        ...page,
        blobKey: page.originalBlobKey ?? page.blobKey,
      };
      const r = await enhancePage(source, {
        outputFormat: 'jpeg',
        quadOverride: manualQuad,
      });
      setResult(r);
      if (r.page.enhancedBlobKey) {
        const blob = await getBlob(r.page.enhancedBlobKey);
        if (blob) setPreviewUrl(blobUrl(r.page.enhancedBlobKey, blob));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
      clearStatus(pageId);
    }
  };

  const accept = async () => {
    if (result?.success) {
      await applyEnhance(pageId, result);
    }
    onClose();
  };

  const discard = () => {
    setResult(null);
    setPreviewUrl(null);
    onClose();
  };

  if (!page || !originalKey) return null;

  const backendId = getEnhanceBackendId();
  const backendMeta = ENHANCE_BACKENDS.find((b) => b.id === backendId);
  const llmMode = isLlmBackend(backendId);

  const stageText = llmMode
    ? elapsed < 2
      ? 'Uploading page to the model…'
      : elapsed < 8
        ? `Model is enhancing the card… (${elapsed}s)`
        : `Still working — large cards take longer (${elapsed}s)`
    : 'Running pipeline…';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl bg-surface-card rounded-card shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        <header className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border-subtle">
          <div>
            <h2 className="font-display text-[22px]">Enhance page</h2>
            <p className="text-ink-muted text-[12px]">
              Backend: {backendMeta?.label ?? backendId}
            </p>
          </div>
          <button
            onClick={discard}
            className="p-2 rounded-full hover:bg-black/5"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {llmMode && (
            <div className="flex gap-2 rounded-card bg-amber-50 border border-amber-200 px-3 py-2 text-[12px] text-amber-900">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <span>
                AI editing may redraw small details (handwriting, signatures). Your API key pays for each page.
                Use the classical backend if exact fidelity to the original matters.
              </span>
            </div>
          )}
          {error && (
            <p className="text-red-600 text-[13px]">Enhance failed: {error}</p>
          )}

          {mode === 'auto' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Panel label="Original">
                {originalUrl && (
                  <img src={originalUrl} alt="Original" className="w-full h-full object-contain rounded-card bg-black" />
                )}
              </Panel>
              <Panel label={running ? 'Working…' : 'Enhanced'}>
                {previewUrl ? (
                  <img src={previewUrl} alt="Enhanced" className="w-full h-full object-contain rounded-card bg-white" />
                ) : running ? (
                  <div className="relative w-full h-full rounded-card overflow-hidden bg-bg-primary">
                    <div className="absolute inset-0 shimmer" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-ink-primary px-4">
                      <Sparkles size={22} className="text-accent-primary animate-pulse" />
                      <div className="text-[13px] text-center">{stageText}</div>
                      <div className="w-44 progress-indet" />
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full grid place-items-center bg-bg-primary rounded-card text-ink-muted">
                    {result && !result.success ? 'Auto-detect failed' : '—'}
                  </div>
                )}
              </Panel>
            </div>
          )}

          {mode === 'manual' && imageSize && originalUrl && (
            <div className="space-y-3">
              <p className="text-[13px] text-ink-muted">
                Drag the four corners to outline the card, then apply.
              </p>
              <ManualQuadEditor
                imageUrl={originalUrl}
                imageSize={imageSize}
                initial={manualQuad ?? defaultInsetQuad(imageSize.width, imageSize.height)}
                onChange={setManualQuad}
              />
              {previewUrl && (
                <div>
                  <p className="text-[12px] uppercase tracking-wide text-ink-muted mb-1">Preview</p>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-60 object-contain rounded-card bg-white"
                  />
                </div>
              )}
            </div>
          )}

          {mode === 'auto' && result && !result.success && !previewUrl && (
            <div className="rounded-card bg-bg-primary border border-border-subtle p-3 text-[13px] text-ink-primary">
              Couldn't find the card corners automatically.
              Try <strong>Adjust corners manually</strong>.
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center gap-2 px-5 py-4 border-t border-border-subtle">
          {mode === 'auto' ? (
            !llmMode && (
              <Button
                variant="secondary"
                onClick={() => {
                  if (imageSize) setManualQuad(defaultInsetQuad(imageSize.width, imageSize.height));
                  setMode('manual');
                }}
                disabled={running}
              >
                <Scissors size={14} /> Adjust corners manually
              </Button>
            )
          ) : (
            <Button
              variant="secondary"
              onClick={() => {
                setMode('auto');
                setResult(null);
                setPreviewUrl(null);
              }}
            >
              <RotateCcw size={14} /> Back to auto
            </Button>
          )}
          {mode === 'manual' && (
            <Button onClick={runManual} disabled={running || !manualQuad}>
              <Check size={14} /> {running ? 'Applying…' : 'Apply crop'}
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="secondary" onClick={discard}>
            Cancel
          </Button>
          <Button
            onClick={accept}
            disabled={running || !result?.success}
          >
            <Check size={14} /> Accept
          </Button>
        </footer>
      </div>
    </div>
  );
}

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[12px] uppercase tracking-wide text-ink-muted mb-1">{label}</p>
      <div className="aspect-[3/4] bg-black rounded-card overflow-hidden">{children}</div>
    </div>
  );
}
