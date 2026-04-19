import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Share2, Sparkles, Settings as SettingsIcon } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { useCardStore } from '../store/useCardStore';
import { DropZone } from '../components/import/DropZone';
import { ThumbStrip } from '../components/arrange/ThumbStrip';
import { MetadataForm } from '../components/metadata/MetadataForm';
import { ExportSheet } from '../components/export/ExportSheet';
import { SettingsModal } from '../components/settings/SettingsModal';
import { Button } from '../components/ui/Button';
import { requestPersistence } from '../lib/db';
import { autofillMetadata, getApiKey } from '../lib/ai';

export default function EditorPage() {
  const navigate = useNavigate();
  const { cardId } = useParams<{ cardId: string }>();
  const editor = useEditorStore();
  const refreshLibrary = useCardStore((s) => s.refresh);
  const [ready, setReady] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [autofillError, setAutofillError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!cardId) return;
      if (editor.cardId !== cardId) {
        const ok = await editor.hydrate(cardId);
        if (!ok) editor.initNew();
      }
      requestPersistence();
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  const saveAndView = async () => {
    if (editor.pageOrder.length === 0) return;
    setSaving(true);
    try {
      const id = await editor.persist();
      await refreshLibrary();
      navigate(`/view/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const saveOnly = async () => {
    if (editor.pageOrder.length === 0) return;
    setSaving(true);
    try {
      await editor.persist();
      await refreshLibrary();
    } finally {
      setSaving(false);
    }
  };

  const openExport = async () => {
    if (editor.pageOrder.length === 0) return;
    if (editor.dirty) {
      setSaving(true);
      try {
        await editor.persist();
        await refreshLibrary();
      } finally {
        setSaving(false);
      }
    }
    setShowExport(true);
  };

  const runAutofill = async () => {
    setAutofillError(null);
    if (!getApiKey()) {
      setShowSettings(true);
      setAutofillError('Add your Anthropic API key in Settings, then try again.');
      return;
    }
    if (editor.pageOrder.length === 0) return;
    setAutofilling(true);
    try {
      if (editor.dirty) await editor.persist();
      const patch = await autofillMetadata(editor.pages, editor.pageOrder);
      editor.updateMetadata(patch);
    } catch (e) {
      setAutofillError((e as Error).message);
    } finally {
      setAutofilling(false);
    }
  };

  if (!ready) return null;

  const slotsLeft = editor.canAdd();
  const hasPages = editor.pageOrder.length > 0;

  return (
    <div className="min-h-full bg-bg-primary pb-40">
      <header className="px-screen-x pt-6 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-full hover:bg-black/5"
          aria-label="Back"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-display text-[22px] font-medium">
          {editor.metadata.title || 'New card'}
        </h1>
        <span className="ml-auto text-[12px] text-ink-muted">
          {editor.pageOrder.length}/8 pages
          {editor.dirty ? ' · unsaved' : ''}
        </span>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-full hover:bg-black/5"
          aria-label="Settings"
        >
          <SettingsIcon size={18} />
        </button>
      </header>

      <main className="px-screen-x mt-6 space-y-8 max-w-3xl mx-auto">
        <section>
          <SectionTitle step={1} title="Import pages" />
          <DropZone
            onFiles={(files) => editor.addFiles(files)}
            slotsLeft={slotsLeft}
            compact={hasPages}
          />
        </section>

        {hasPages && (
          <section>
            <SectionTitle step={2} title="Arrange" />
            <ThumbStrip
              order={editor.pageOrder}
              urls={editor.pageUrls}
              onReorder={editor.reorder}
              onRemove={editor.removePage}
            />
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle step={3} title="Details" inline />
            <button
              onClick={runAutofill}
              disabled={!hasPages || autofilling}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-primary hover:underline disabled:opacity-40 disabled:no-underline"
            >
              <Sparkles size={14} />
              {autofilling ? 'Autofilling…' : 'Autofill with AI'}
            </button>
          </div>
          {autofillError && (
            <p className="text-[12px] text-red-600 mb-3">{autofillError}</p>
          )}
          <MetadataForm
            value={editor.metadata}
            onChange={editor.updateMetadata}
          />
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-surface-card/95 backdrop-blur border-t border-border-subtle p-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Button
            variant="secondary"
            onClick={saveOnly}
            disabled={!hasPages || saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button
            variant="secondary"
            onClick={openExport}
            disabled={!hasPages}
            className="hidden sm:inline-flex"
          >
            <Share2 size={16} /> Export
          </Button>
          <Button
            onClick={saveAndView}
            disabled={!hasPages || saving}
            className="flex-1"
          >
            <Eye size={16} /> Save & open viewer
          </Button>
        </div>
      </footer>

      {showExport && editor.cardId && (
        <ExportSheet cardId={editor.cardId} onClose={() => setShowExport(false)} />
      )}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

function SectionTitle({
  step,
  title,
  inline,
}: {
  step: number;
  title: string;
  inline?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${inline ? '' : 'mb-3'}`}>
      <span className="w-6 h-6 rounded-full bg-accent-primary text-white text-[12px] font-bold grid place-items-center">
        {step}
      </span>
      <h2 className="font-display text-[20px]">{title}</h2>
    </div>
  );
}
