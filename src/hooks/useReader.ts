import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SpeechReader,
  collectChunks,
  isSpeechSupported,
  pickRussianVoice,
  type ReaderState,
  type SpeechChunk,
} from '@/lib/speech';
import { TrackReader } from '@/lib/track-reader';
import { ReadAlong } from '@/lib/read-along';

type Narrator = SpeechReader | TrackReader;

const IDLE: ReaderState = { status: 'idle', index: 0, total: 0, rate: 1 };

/**
 * Озвучивание материала.
 *
 * Источников два, и порядок важен: если есть заранее сгенерированные
 * файлы — играем их, потому что все слышат одинаковый голос независимо
 * от системы. Синтез в браузере остаётся запасным: на Windows обычно
 * достаётся бедный системный голос, а кое-где русского нет вовсе.
 */
export function useReader(enabled: boolean) {
  const [state, setState] = useState<ReaderState>(IDLE);
  const [source, setSource] = useState<'track' | 'speech' | 'none'>('none');
  const reader = useRef<Narrator | null>(null);
  const chunks = useRef<SpeechChunk[]>([]);
  const along = useRef<ReadAlong | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const start = async () => {
      const main = document.querySelector('main');
      if (!main) return;

      const found = collectChunks(main);
      if (!found.length) return;

      let tracks: Record<string, string> | null = null;
      try {
        const res = await fetch('/audio/manifest.json');
        if (res.ok) tracks = (await res.json()) as Record<string, string>;
      } catch {
        tracks = null;
      }
      if (cancelled) return;

      const hasTracks = TrackReader.hasTracks(tracks);
      if (!hasTracks && !isSpeechSupported(window)) {
        setSource('none');
        return;
      }

      chunks.current = found;

      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      along.current = still ? null : new ReadAlong();

      const highlight = (index: number | null) => {
        found.forEach((c, i) => {
          if (!c.el) return;
          const active = i === index;
          c.el.classList.toggle('is-reading', active);
          if (active) {
            c.el.scrollIntoView({ block: 'center', behavior: still ? 'auto' : 'smooth' });
            if (c.role !== 'image') along.current?.attach(c.el);
          }
        });
        if (index === null) along.current?.clear();
      };

      const onChange = (next: ReaderState) => {
        setState(next);
        highlight(next.status === 'playing' ? next.index : null);
      };
      const onProgress = (p: number) => along.current?.setProgress(p);

      if (hasTracks) {
        reader.current = new TrackReader(found, tracks!, onChange, onProgress);
        setSource('track');
      } else {
        const speech = new SpeechReader(found, window.speechSynthesis, onChange, onProgress);
        const applyVoice = () =>
          speech.setVoice(pickRussianVoice(window.speechSynthesis.getVoices()));
        applyVoice();
        window.speechSynthesis.addEventListener('voiceschanged', applyVoice);
        reader.current = speech;
        setSource('speech');
      }

      setState(reader.current.getState());
    };

    void start();

    return () => {
      cancelled = true;
      reader.current?.pause();
      window.speechSynthesis?.cancel();
    };
  }, [enabled]);

  const toggle = useCallback(() => {
    const r = reader.current;
    if (!r) return;
    if (r.getState().status === 'playing') r.pause();
    else r.play();
  }, []);

  const jumpChapter = useCallback((direction: -1 | 1) => {
    const r = reader.current;
    if (!r) return;
    const from = r.getState().index;
    const list = chunks.current;
    const found =
      direction === 1
        ? list.findIndex((c, i) => i > from && c.role === 'heading')
        : list.reduce((acc, c, i) => (i < from && c.role === 'heading' ? i : acc), -1);
    if (found >= 0) r.goTo(found);
  }, []);

  return useMemo(
    () => ({
      state,
      source,
      toggle,
      next: () => reader.current?.next(),
      prev: () => reader.current?.prev(),
      jumpChapter,
      setRate: (rate: number) => reader.current?.setRate(rate),
      current: chunks.current[state.index],
    }),
    [state, source, toggle, jumpChapter],
  );
}
