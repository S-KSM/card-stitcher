import { useState } from 'react';
import { FileDown, Film, Package, X } from 'lucide-react';
import { loadCard } from '../../lib/db';
import { exportPdf } from './exporters/pdfExporter';
import { exportZip } from './exporters/zipExporter';
import { exportGif } from './exporters/gifExporter';
import { Button } from '../ui/Button';

interface Props {
  cardId: string;
  onClose: () => void;
}

type Busy = null | 'pdf' | 'gif' | 'zip';

export function ExportSheet({ cardId, onClose }: Props) {
  const [busy, setBusy] = useState<Busy>(null);
  const [gifProgress, setGifProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const runExport = async (kind: Busy) => {
    if (!kind) return;
    setError(null);
    setBusy(kind);
    setGifProgress(0);
    try {
      const card = await loadCard(cardId);
      if (!card) throw new Error('Card not found');
      if (kind === 'pdf') await exportPdf(card);
      else if (kind === 'zip') await exportZip(card);
      else if (kind === 'gif')
        await exportGif(card, { onProgress: setGifProgress });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
      setGifProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center p-4">
      <div
        className="w-full max-w-md bg-surface-card rounded-card shadow-xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between px-5 pt-5 pb-2">
          <h2 className="font-display text-[22px]">Export card</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>
        <div className="px-5 pb-5 space-y-3">
          <ExportRow
            icon={<FileDown size={18} />}
            title="PDF"
            desc="Archival-quality, embeds metadata."
            disabled={!!busy}
            onClick={() => runExport('pdf')}
            loading={busy === 'pdf'}
          />
          <ExportRow
            icon={<Film size={18} />}
            title="Animated GIF"
            desc="Share to Messages, WhatsApp, social."
            disabled={!!busy}
            onClick={() => runExport('gif')}
            loading={busy === 'gif'}
            progress={busy === 'gif' ? gifProgress : undefined}
          />
          <ExportRow
            icon={<Package size={18} />}
            title="ZIP of images"
            desc="Originals + metadata for re-import or edit."
            disabled={!!busy}
            onClick={() => runExport('zip')}
            loading={busy === 'zip'}
          />
          {error && (
            <p className="text-red-600 text-[13px]">Export failed: {error}</p>
          )}
          <div className="pt-2">
            <Button variant="secondary" className="w-full" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportRow({
  icon,
  title,
  desc,
  onClick,
  disabled,
  loading,
  progress,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  progress?: number;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 rounded-card border border-border-subtle bg-surface-card hover:bg-bg-primary p-4 text-left transition disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <span className="w-9 h-9 rounded-full bg-accent-primary/10 text-accent-primary grid place-items-center">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block font-medium text-[15px]">{title}</span>
        <span className="block text-ink-muted text-[12px]">{desc}</span>
        {loading && progress !== undefined && (
          <span className="block mt-1 h-1 rounded-full bg-border-subtle overflow-hidden">
            <span
              className="block h-full bg-accent-primary transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </span>
        )}
      </span>
      {loading && <span className="text-[12px] text-ink-muted">Working…</span>}
    </button>
  );
}
