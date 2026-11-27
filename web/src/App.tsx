import { useEffect } from 'react';
import { Toaster } from './components/Toaster.tsx';
import { ActList } from './features/acts/ActList.tsx';
import { ProjectBar } from './features/project/ProjectBar.tsx';
import { ProjectSettings } from './features/project/ProjectSettings.tsx';
import { SfxLibrary } from './features/sfx/SfxLibrary.tsx';
import { Timeline } from './features/timeline/Timeline.tsx';
import { useLibraryStore } from './store/library-store.ts';
import { usePlayerStore } from './store/player-store.ts';
import { useProjectStore } from './store/project-store.ts';

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        usePlayerStore.getState().toggle();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedCueId, removeCue } = useProjectStore.getState();
        if (selectedCueId) removeCue(selectedCueId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

function ServerBanner() {
  const { serverError, health, load } = useLibraryStore();
  if (serverError) {
    return (
      <div className="banner banner--error">
        {serverError}{' '}
        <button className="link-btn" onClick={() => void load()}>
          Coba lagi
        </button>
      </div>
    );
  }
  if (health && !health.ffmpeg) {
    return <div className="banner banner--warn">ffmpeg/ffprobe tidak bisa dijalankan server — generate, render, dan ekspor tidak akan jalan. Jalankan ulang `npm install`, lalu lihat log server.</div>;
  }
  return null;
}

export function App() {
  useEffect(() => void useLibraryStore.getState().load(), []);
  useShortcuts();

  return (
    <div className="app">
      <ProjectBar />
      <ServerBanner />
      <div className="workspace">
        <aside className="sidebar">
          <ProjectSettings />
          <SfxLibrary />
        </aside>
        <main className="main">
          <ActList />
        </main>
      </div>
      <Timeline />
      <Toaster />
    </div>
  );
}
