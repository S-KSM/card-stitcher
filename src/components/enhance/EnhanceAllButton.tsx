import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { enhancePage } from '../../lib/enhance';
import { useEditorStore } from '../../store/useEditorStore';
import { useEnhanceStore } from '../../store/useEnhanceStore';

export function EnhanceAllButton() {
  const pageOrder = useEditorStore((s) => s.pageOrder);
  const pages = useEditorStore((s) => s.pages);
  const applyEnhance = useEditorStore((s) => s.applyEnhance);
  const setBatch = useEnhanceStore((s) => s.setBatch);
  const setStatus = useEnhanceStore((s) => s.setStatus);
  const clearStatus = useEnhanceStore((s) => s.clear);
  const batch = useEnhanceStore((s) => s.batch);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (batch || pageOrder.length === 0) return;
    setError(null);
    const targets = pageOrder.filter((id) => !pages[id]?.useEnhanced);
    if (targets.length === 0) return;
    setBatch({ total: targets.length, done: 0 });
    let done = 0;
    for (const id of targets) {
      const page = pages[id];
      if (!page) continue;
      setStatus(id, { kind: 'running' });
      try {
        const source = { ...page, blobKey: page.originalBlobKey ?? page.blobKey };
        const r = await enhancePage(source, { outputFormat: 'jpeg' });
        if (r.success) await applyEnhance(id, r);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        clearStatus(id);
        done += 1;
        setBatch({ total: targets.length, done });
      }
    }
    setBatch(null);
  };

  const running = !!batch;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={run}
        disabled={running || pageOrder.length === 0}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-primary hover:underline disabled:opacity-40 disabled:no-underline"
      >
        <Sparkles size={14} />
        {running ? `Enhancing ${batch?.done ?? 0}/${batch?.total ?? 0}…` : 'Enhance all'}
      </button>
      {error && <span className="text-[12px] text-red-600">{error}</span>}
    </div>
  );
}
