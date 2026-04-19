import { Routes, Route, Navigate } from 'react-router-dom';
import LibraryPage from './routes/LibraryPage';
import EditorPage from './routes/EditorPage';
import ViewerPage from './routes/ViewerPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LibraryPage />} />
      <Route path="/edit/:cardId" element={<EditorPage />} />
      <Route path="/view/:cardId" element={<ViewerPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
