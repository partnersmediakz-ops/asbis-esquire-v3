import { useEffect, useState } from 'react';
import { Article } from '@/components/Article';
import { ReaderBar } from '@/components/ReaderBar';
import { STORAGE_KEY, applyMode, readStoredMode, resolveMode, type Mode } from '@/lib/mode';

export default function App() {
  const [mode, setMode] = useState<Mode>('standard');

  useEffect(() => {
    const next = resolveMode({
      pathname: window.location.pathname,
      stored: readStoredMode(localStorage),
      prefersContrast: window.matchMedia('(prefers-contrast: more)').matches,
    });
    setMode(next);
  }, []);

  useEffect(() => {
    applyMode(document, mode);
    document.title =
      mode === 'audio'
        ? 'Просто жить — аудиоверсия — Esquire × ASBIS'
        : mode === 'accessible'
          ? 'Просто жить — версия для слабовидящих — Esquire × ASBIS'
          : 'Просто жить — Esquire × ASBIS';
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* приватный режим — выбор просто не переживёт перезагрузку */
    }
  }, [mode]);

  return (
    <>
      <a
        href="#main"
        className="absolute left-2 top-[-100px] z-50 rounded-full bg-ink px-5 py-3 text-paper focus:top-2"
      >
        Перейти к содержанию
      </a>

      <header className="shell flex items-center justify-between py-5">
        <a href="/" className="text-[length:var(--fs-ui)] font-bold tracking-[0.14em]">
          ESQUIRE
        </a>
      </header>

      <Article mode={mode} />
      <ReaderBar mode={mode} onMode={setMode} />
    </>
  );
}
