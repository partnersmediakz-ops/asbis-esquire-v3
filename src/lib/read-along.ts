export interface WordSlot {
  el: HTMLElement;
  /** Доля фрагмента, на которой слово начинается, 0..1. */
  start: number;
  end: number;
}

const WORD_CLASS = 'read-word';

/**
 * Разбивает текст на слова, сохраняя пробелы настоящими узлами.
 *
 * Пробел отступом здесь не годится: без текстовых пробелов копирование
 * и чтение с экрана отдают слипшийся текст. На этом проекте так уже
 * ломались заголовки — повторять нельзя.
 *
 * Если слова уже разложены анимацией появления заголовков, переиспользуем
 * их, а не режем разметку второй раз.
 */
export function splitWords(root: HTMLElement): HTMLElement[] {
  const existing = Array.from(root.querySelectorAll<HTMLElement>('[data-rv]'));
  if (existing.length) return existing;

  const already = Array.from(root.querySelectorAll<HTMLElement>(`.${WORD_CLASS}`));
  if (already.length) return already;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  const words: HTMLElement[] = [];
  for (const node of nodes) {
    const value = node.textContent ?? '';
    if (!value.trim()) continue;

    const frag = document.createDocumentFragment();
    for (const part of value.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        frag.appendChild(document.createTextNode(part));
        continue;
      }
      const span = document.createElement('span');
      span.className = WORD_CLASS;
      span.textContent = part;
      frag.appendChild(span);
      words.push(span);
    }
    node.replaceWith(frag);
  }

  return words;
}

/**
 * Раскладка слов по времени фрагмента.
 *
 * Тайминги пропорциональны длине слов, а не их числу: «и» и
 * «безопасности» произносятся не одинаково. Точных меток Silero не даёт,
 * поэтому это оценка — на коротких фрагментах расхождение незаметно,
 * на длинных сглаживается плавным переходом подсветки.
 */
export function buildTimeline(words: HTMLElement[]): WordSlot[] {
  const lengths = words.map((w) => Math.max((w.textContent ?? '').trim().length, 1));
  const total = lengths.reduce((sum, n) => sum + n, 0) || 1;

  let acc = 0;
  return words.map((el, i) => {
    const start = acc / total;
    acc += lengths[i]!;
    return { el, start, end: acc / total };
  });
}

/** Индекс слова, звучащего при данной доле фрагмента. */
export function wordAt(slots: WordSlot[], progress: number): number {
  if (!slots.length) return -1;
  const p = Math.min(Math.max(progress, 0), 1);
  for (let i = 0; i < slots.length; i++) {
    if (p < slots[i]!.end) return i;
  }
  return slots.length - 1;
}

export class ReadAlong {
  private slots: WordSlot[] = [];
  private current = -1;

  /** Готовит фрагмент к подсветке и возвращает число слов. */
  attach(el: HTMLElement): number {
    this.clear();
    this.slots = buildTimeline(splitWords(el));
    this.current = -1;
    return this.slots.length;
  }

  setProgress(progress: number): void {
    const next = wordAt(this.slots, progress);
    if (next === this.current) return;

    this.slots[this.current]?.el.classList.remove('is-current-word');
    this.slots[next]?.el.classList.add('is-current-word');
    this.current = next;
  }

  clear(): void {
    this.slots[this.current]?.el.classList.remove('is-current-word');
    this.slots = [];
    this.current = -1;
  }
}
