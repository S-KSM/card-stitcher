import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CardViewer } from '../components/viewer/CardViewer';
import { ExportSheet } from '../components/export/ExportSheet';
import { loadCard, getBlob } from '../lib/db';
import { blobUrl } from '../lib/imageUtils';

export default function ViewerPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const [urls, setUrls] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [ready, setReady] = useState(false);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cardId) return;
      const card = await loadCard(cardId);
      if (!card) {
        navigate('/');
        return;
      }
      const list: string[] = [];
      for (const pid of card.pageOrder) {
        const page = card.pages[pid];
        if (!page) continue;
        const blob = await getBlob(page.blobKey);
        if (blob) list.push(blobUrl(page.blobKey, blob));
      }
      if (!cancelled) {
        setUrls(list);
        setTitle(card.metadata.title);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cardId, navigate]);

  if (!ready) return <div className="min-h-full bg-bg-viewer" />;

  return (
    <>
      <CardViewer
        title={title}
        urls={urls}
        onBack={() => navigate('/')}
        onExport={() => setShowExport(true)}
      />
      {showExport && cardId && (
        <ExportSheet cardId={cardId} onClose={() => setShowExport(false)} />
      )}
    </>
  );
}
