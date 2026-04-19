import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, BookOpen, Search, Settings as SettingsIcon, X } from 'lucide-react';
import { useCardStore } from '../store/useCardStore';
import { useEditorStore } from '../store/useEditorStore';
import { getBlob } from '../lib/db';
import { blobUrl } from '../lib/imageUtils';
import { Button } from '../components/ui/Button';
import { SettingsModal } from '../components/settings/SettingsModal';
import { InstallPrompt } from '../components/pwa/InstallPrompt';
import { OCCASIONS, type Occasion } from '../types/card';

type OccasionFilter = Occasion | 'all';

export default function LibraryPage() {
  const navigate = useNavigate();
  const { cards, loading, refresh, remove } = useCardStore();
  const initNew = useEditorStore((s) => s.initNew);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [occasionFilter, setOccasionFilter] = useState<OccasionFilter>('all');
  const [fromQuery, setFromQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const c of cards) {
        if (c.coverBlobKey) {
          const b = await getBlob(c.coverBlobKey);
          if (b) next[c.id] = blobUrl(c.coverBlobKey, b);
        }
      }
      if (!cancelled) setCovers(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [cards]);

  const occasionLabel = useMemo(
    () => Object.fromEntries(OCCASIONS.map((o) => [o.value, o.label])),
    [],
  );

  const availableOccasions = useMemo(() => {
    const set = new Set<Occasion>();
    for (const c of cards) set.add(c.metadata.occasion);
    return OCCASIONS.filter((o) => set.has(o.value));
  }, [cards]);

  const filtered = useMemo(() => {
    const q = fromQuery.trim().toLowerCase();
    return cards.filter((c) => {
      if (occasionFilter !== 'all' && c.metadata.occasion !== occasionFilter) return false;
      if (q) {
        const hay = `${c.metadata.from} ${c.metadata.to} ${c.metadata.title}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [cards, occasionFilter, fromQuery]);

  const newCard = () => {
    initNew();
    const id = useEditorStore.getState().cardId!;
    navigate(`/edit/${id}`);
  };

  const activeFilters = occasionFilter !== 'all' || fromQuery.trim().length > 0;
  const clearFilters = () => {
    setOccasionFilter('all');
    setFromQuery('');
  };

  return (
    <div className="min-h-full bg-bg-primary">
      <header className="px-screen-x pt-10 pb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[34px] leading-tight font-medium">
            Card Stitcher
          </h1>
          <p className="text-ink-muted text-[15px] mt-1">
            Stitch scanned cards into one keepsake.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <InstallPrompt />
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-full hover:bg-black/5"
            aria-label="Settings"
          >
            <SettingsIcon size={18} />
          </button>
          <Button onClick={newCard}>
            <Plus size={18} /> New card
          </Button>
        </div>
      </header>

      {cards.length > 0 && (
        <div className="px-screen-x pb-4 flex flex-wrap items-center gap-2">
          <FilterPill
            active={occasionFilter === 'all'}
            onClick={() => setOccasionFilter('all')}
          >
            All
          </FilterPill>
          {availableOccasions.map((o) => (
            <FilterPill
              key={o.value}
              active={occasionFilter === o.value}
              onClick={() => setOccasionFilter(o.value)}
            >
              {o.label}
            </FilterPill>
          ))}
          <div className="ml-auto relative flex items-center">
            <Search size={14} className="absolute left-3 text-ink-muted" />
            <input
              type="text"
              value={fromQuery}
              onChange={(e) => setFromQuery(e.target.value)}
              placeholder="Search title or sender…"
              className="pl-8 pr-3 py-2 rounded-full border border-border-subtle bg-surface-card text-[13px] w-[240px] focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15 outline-none"
            />
          </div>
          {activeFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-[12px] text-ink-muted hover:text-ink-primary"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>
      )}

      <main className="px-screen-x pb-24">
        {loading && cards.length === 0 ? (
          <p className="text-ink-muted">Loading…</p>
        ) : cards.length === 0 ? (
          <EmptyState onStart={newCard} />
        ) : filtered.length === 0 ? (
          <p className="text-ink-muted mt-8 text-center">
            No cards match this filter.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
            {filtered.map((c) => (
              <article
                key={c.id}
                className="group bg-surface-card rounded-card border border-border-subtle overflow-hidden shadow-sm hover:shadow-md transition"
              >
                <button
                  onClick={() => navigate(`/view/${c.id}`)}
                  className="block w-full aspect-[3/4] bg-bg-primary overflow-hidden"
                >
                  {covers[c.id] ? (
                    <img
                      src={covers[c.id]}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-ink-muted">
                      <BookOpen size={32} />
                    </div>
                  )}
                </button>
                <div className="p-3">
                  <h3 className="font-medium text-[15px] truncate">
                    {c.metadata.title || 'Untitled card'}
                  </h3>
                  <p className="text-ink-muted text-[12px] truncate">
                    {occasionLabel[c.metadata.occasion]} · {c.pageOrder.length} pages
                    {c.metadata.from ? ` · from ${c.metadata.from}` : ''}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => navigate(`/edit/${c.id}`)}
                      className="text-[13px] text-accent-secondary hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this card?')) remove(c.id);
                      }}
                      className="text-[13px] text-red-600 hover:underline ml-auto inline-flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-3 py-1.5 rounded-full text-[13px] font-medium transition border',
        active
          ? 'bg-accent-primary text-white border-accent-primary'
          : 'bg-surface-card text-ink-primary border-border-subtle hover:bg-border-subtle/30',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="mt-16 text-center">
      <div className="mx-auto w-20 h-20 rounded-full bg-accent-primary/10 grid place-items-center mb-4">
        <BookOpen className="text-accent-primary" size={32} />
      </div>
      <h2 className="font-display text-[24px] mb-2">No cards yet</h2>
      <p className="text-ink-muted max-w-[360px] mx-auto mb-6">
        Scan a greeting card, drop the images in, and we'll stitch them into
        one keepsake you can re-open any time.
      </p>
      <Button onClick={onStart}>
        <Plus size={18} /> Create your first card
      </Button>
    </div>
  );
}
