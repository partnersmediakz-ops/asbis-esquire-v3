import { useEffect, useState } from 'react';
import { MODES, MODE_LABELS, type Mode } from '@/lib/mode';
import {
  SCALE_STEPS,
  SCALE_KEY,
  applyScale,
  readStoredScale,
  scaleLabel,
  shiftStep,
  type ScaleStep,
} from '@/lib/text-scale';
import { useReader } from '@/hooks/useReader';

interface Props {
  mode: Mode;
  onMode: (mode: Mode) => void;
}

const RATES = [0.75, 1, 1.25, 1.5];

/**
 * Панель читателя.
 *
 * В прежних версиях выбор версии жил в шапке, а плеер — отдельной
 * полосой внизу. Здесь всё собрано в один орган управления и доступно
 * всегда: материал о доступности не должен прятать её настройки за
 * переключателем, до которого ещё надо додуматься.
 */
export function ReaderBar({ mode, onMode }: Props) {
  const [scale, setScale] = useState<ScaleStep>(1);
  const reader = useReader(mode === 'audio');

  useEffect(() => {
    const stored = readStoredScale(localStorage);
    setScale(stored);
    applyScale(document, stored);
  }, []);

  const changeScale = (direction: -1 | 1) => {
    const next = shiftStep(scale, direction);
    if (next === scale) return;
    setScale(next);
    applyScale(document, next);
    try {
      localStorage.setItem(SCALE_KEY, String(next));
    } catch {
      /* приватный режим — настройка просто не переживёт перезагрузку */
    }
  };

  const playing = reader.state.status === 'playing';

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/15 bg-paper/95 backdrop-blur">
      <div className="shell flex flex-wrap items-center gap-x-6 gap-y-3 py-3">
        <div role="radiogroup" aria-label="Версия материала" className="flex items-center gap-1">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={m === mode}
              onClick={() => onMode(m)}
              className={`min-h-[var(--tap-min)] rounded-full px-4 text-[length:var(--fs-ui)] transition-colors ${
                m === mode ? 'bg-ink text-paper font-bold' : 'hover:bg-ink/10'
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[length:var(--fs-ui)] opacity-70">Размер</span>
          <button
            type="button"
            onClick={() => changeScale(-1)}
            disabled={scale === SCALE_STEPS[0]}
            aria-label="Уменьшить размер текста"
            className="min-h-[var(--tap-min)] min-w-[var(--tap-min)] rounded-full border-2 border-ink text-[length:var(--fs-ui)] font-bold disabled:opacity-35"
          >
            А&minus;
          </button>
          <output
            aria-live="polite"
            className="min-w-[5ch] text-center text-[length:var(--fs-ui)] tabular-nums"
          >
            {scaleLabel(scale)}
          </output>
          <button
            type="button"
            onClick={() => changeScale(1)}
            disabled={scale === SCALE_STEPS[SCALE_STEPS.length - 1]}
            aria-label="Увеличить размер текста"
            className="min-h-[var(--tap-min)] min-w-[var(--tap-min)] rounded-full border-2 border-ink text-[length:var(--fs-ui)] font-bold disabled:opacity-35"
          >
            А+
          </button>
        </div>

        {mode === 'audio' && reader.source === 'pending' && (
          <p aria-live="polite" className="text-[length:var(--fs-ui)] opacity-75">
            Готовим озвучку…
          </p>
        )}

        {mode === 'audio' && (reader.source === 'track' || reader.source === 'speech') && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => reader.jumpChapter(-1)}
              aria-label="Предыдущая глава"
              className="min-h-[var(--tap-min)] min-w-[var(--tap-min)] rounded-full border-2 border-ink"
            >
              &laquo;
            </button>
            <button
              type="button"
              onClick={reader.prev}
              aria-label="Предыдущий фрагмент"
              className="min-h-[var(--tap-min)] min-w-[var(--tap-min)] rounded-full border-2 border-ink"
            >
              &lsaquo;
            </button>
            <button
              type="button"
              onClick={reader.toggle}
              className="min-h-[var(--tap-min)] rounded-full bg-ink px-5 text-[length:var(--fs-ui)] font-bold text-paper"
            >
              {playing ? 'Пауза' : 'Слушать материал'}
            </button>
            <button
              type="button"
              onClick={reader.next}
              aria-label="Следующий фрагмент"
              className="min-h-[var(--tap-min)] min-w-[var(--tap-min)] rounded-full border-2 border-ink"
            >
              &rsaquo;
            </button>
            <button
              type="button"
              onClick={() => reader.jumpChapter(1)}
              aria-label="Следующая глава"
              className="min-h-[var(--tap-min)] min-w-[var(--tap-min)] rounded-full border-2 border-ink"
            >
              &raquo;
            </button>

            <label className="flex items-center gap-2">
              <span className="sr-only">Скорость чтения</span>
              <select
                onChange={(e) => reader.setRate(Number(e.target.value))}
                defaultValue="1"
                className="min-h-[var(--tap-min)] rounded-full border-2 border-ink bg-transparent px-3 text-[length:var(--fs-ui)]"
              >
                {RATES.map((r) => (
                  <option key={r} value={r}>
                    {String(r).replace('.', ',')}×
                  </option>
                ))}
              </select>
            </label>

            <p aria-live="polite" className="text-[length:var(--fs-ui)] opacity-75">
              {playing
                ? `${reader.state.index + 1} из ${reader.state.total}`
                : reader.state.status === 'paused'
                  ? `Пауза на ${reader.state.index + 1} из ${reader.state.total}`
                  : 'Готово к прослушиванию'}
            </p>

            <p className="text-[length:var(--fs-ui)] opacity-65">
              <span className="sr-only">Источник звука: </span>
              {reader.source === 'track' ? 'Запись' : 'Синтез в браузере'}
            </p>
          </div>
        )}

        {mode === 'audio' && reader.source === 'none' && (
          <p className="text-[length:var(--fs-ui)]">
            Ваш браузер не умеет озвучивать текст, а записи недоступны. Материал можно прочитать
            глазами или включить версию для слабовидящих с крупным шрифтом.
          </p>
        )}
      </div>
    </div>
  );
}
