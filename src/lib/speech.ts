import { forSpeech } from './pronounce';

export type ChunkRole = 'title' | 'heading' | 'caption' | 'image' | 'body';

export interface SpeechChunk {
  id: string;
  /** Что произносится вслух, вместе с пояснением роли. */
  text: string;
  /** Что подсвечивается на экране — без служебного пояснения. */
  plain: string;
  /**
   * Длина служебного пояснения в произносимой строке.
   *
   * Хранится явно, а не вычисляется разницей длин: после замены латиницы
   * русской записью длины text и plain расходятся сами по себе, и разница
   * перестала бы означать смещение.
   */
  prefixLen: number;
  role: ChunkRole;
  el?: HTMLElement;
}

/**
 * Пояснения перед фрагментом.
 *
 * Незрячий читатель не видит вёрстки: без них заголовок главы и подпись
 * к фотографии сливаются с основным текстом в один поток, и структура
 * материала теряется.
 */
const ROLE_PREFIX: Record<ChunkRole, string> = {
  title: 'Заголовок материала.',
  heading: 'Глава.',
  caption: 'Врезка.',
  image: 'Фотография.',
  body: '',
};

export type ReaderStatus = 'idle' | 'playing' | 'paused';

export interface ReaderState {
  status: ReaderStatus;
  index: number;
  total: number;
  rate: number;
}

export const POSITION_KEY = 'esq-speech-pos';

export const RATES = [0.75, 1, 1.25, 1.5] as const;

export function clampRate(rate: number): number {
  return RATES.reduce((best, r) => (Math.abs(r - rate) < Math.abs(best - rate) ? r : best), RATES[1]);
}

export function isSpeechSupported(win: Partial<Window>): boolean {
  return 'speechSynthesis' in win && win.speechSynthesis != null;
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

function roleOf(el: HTMLElement): ChunkRole {
  const explicit = el.dataset.speechRole as ChunkRole | undefined;
  if (explicit) return explicit;
  if (el.tagName === 'H1') return 'title';
  if (el.tagName === 'H2') return 'heading';
  if (el.tagName === 'IMG') return 'image';
  if (el.closest('blockquote, figcaption')) return 'caption';
  return 'body';
}

/**
 * Весь материал в порядке чтения: заголовки, врезки, описания фотографий
 * и основной текст.
 *
 * Раньше собирались только абзацы — незрячий слушал текст без заголовков
 * глав и без единого упоминания, что на странице вообще есть фотографии.
 * Для материала о технологиях доступности это никуда не годится.
 *
 * Порядок берём обходом документа, а не по типам: так поток совпадает
 * с тем, что видит зрячий читатель.
 */
export function collectChunks(root: ParentNode): SpeechChunk[] {
  const nodes = root.querySelectorAll<HTMLElement>(
    'h1, h2, p[data-speech], blockquote .quote__text, figcaption .caption__text, img[alt]:not([alt=""])',
  );

  const out: SpeechChunk[] = [];
  let n = 0;

  nodes.forEach((el) => {
    // Скрытое от вспомогательных технологий не читаем: это декор.
    if (el.closest('[aria-hidden="true"]')) return;

    const role = roleOf(el);
    const plain =
      role === 'image' ? clean((el as HTMLImageElement).alt) : clean(el.textContent ?? '');
    if (!plain) return;

    // Один и тот же текст может попасть под два селектора — не дублируем.
    if (out.some((c) => c.plain === plain)) return;

    n += 1;
    const prefix = ROLE_PREFIX[role];
    const spoken = prefix ? `${prefix} ${plain}` : plain;
    out.push({
      id: el.dataset.speech || `chunk-${n}`,
      // Латиница уходит в озвучку русской записью: синтез её попросту
      // пропускает, и «Сканер LiDAR» звучал как «Сканер».
      text: forSpeech(spoken),
      plain,
      prefixLen: prefix ? forSpeech(`${prefix} `).length : 0,
      role,
      el,
    });
  });

  return out;
}

/**
 * Лучший доступный русский голос.
 *
 * Голоса Siri системой наружу не отдаются, поэтому берём то, что есть:
 * сначала догруженные пользователем улучшенные голоса (они заметно живее),
 * затем локальные, затем любой русский. На Windows выбор беднее, чем на
 * устройствах Apple — там обычно доступна Milena.
 */
export function pickRussianVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const russian = voices.filter((v) => v.lang?.toLowerCase().startsWith('ru'));
  if (!russian.length) return null;

  const score = (v: SpeechSynthesisVoice): number => {
    let s = 0;
    if (/enhanced|premium|улучш/i.test(v.name)) s += 4;
    if (/milena|мilena|милена|yuri|юрий/i.test(v.name)) s += 2;
    if (v.localService) s += 1;
    return s;
  };

  return [...russian].sort((a, b) => score(b) - score(a))[0] ?? null;
}

export class SpeechReader {
  private chunks: SpeechChunk[];
  private index = 0;
  private rate = 1;
  private status: ReaderStatus = 'idle';
  private synth: SpeechSynthesis;
  private onChange: (state: ReaderState) => void;
  private onProgress?: (progress: number) => void;
  private voice: SpeechSynthesisVoice | null = null;

  constructor(
    chunks: SpeechChunk[],
    synth: SpeechSynthesis,
    onChange: (s: ReaderState) => void,
    onProgress?: (progress: number) => void,
  ) {
    this.chunks = chunks;
    this.synth = synth;
    this.onChange = onChange;
    this.onProgress = onProgress;
    this.index = this.restore();
  }

  setVoice(voice: SpeechSynthesisVoice | null): void {
    this.voice = voice;
  }

  private restore(): number {
    try {
      const raw = sessionStorage.getItem(POSITION_KEY);
      const n = raw === null ? 0 : Number(raw);
      return Number.isInteger(n) && n >= 0 && n < this.chunks.length ? n : 0;
    } catch {
      return 0;
    }
  }

  private persist(): void {
    try {
      sessionStorage.setItem(POSITION_KEY, String(this.index));
    } catch {}
  }

  getState(): ReaderState {
    return { status: this.status, index: this.index, total: this.chunks.length, rate: this.rate };
  }

  currentChunk(): SpeechChunk | null {
    return this.chunks[this.index] ?? null;
  }

  private emit(): void {
    this.persist();
    this.onChange(this.getState());
  }

  private speakCurrent(): void {
    const chunk = this.chunks[this.index];
    if (!chunk) {
      this.status = 'idle';
      this.index = 0;
      this.emit();
      return;
    }

    const utter = new SpeechSynthesisUtterance(chunk.text);

    /*
     * Событие границы слова даёт позицию в произносимой строке, и здесь
     * подсветка попадает точно, без оценки по длительности. Смещение на
     * длину служебного пояснения обязательно: вслух звучит «Глава. …»,
     * а на экране только сам заголовок.
     */
    const spokenLen = chunk.text.length - chunk.prefixLen;
    utter.onboundary = (event) => {
      if (!this.onProgress || spokenLen <= 0) return;
      const at = (event.charIndex ?? 0) - chunk.prefixLen;
      this.onProgress(Math.min(Math.max(at / spokenLen, 0), 1));
    };
    utter.lang = 'ru-RU';
    utter.rate = this.rate;
    if (this.voice) utter.voice = this.voice;

    utter.onend = () => {
      if (this.status !== 'playing') return;
      this.index += 1;
      if (this.index >= this.chunks.length) {
        this.status = 'idle';
        this.index = 0;
        this.emit();
        return;
      }
      this.emit();
      this.speakCurrent();
    };

    this.synth.speak(utter);
  }

  play(): void {
    if (this.status === 'playing') return;
    this.status = 'playing';
    this.synth.cancel();
    this.emit();
    this.speakCurrent();
  }

  pause(): void {
    this.status = 'paused';
    this.synth.cancel();
    this.emit();
  }

  next(): void {
    this.jump(this.index + 1);
  }

  prev(): void {
    this.jump(this.index - 1);
  }

  /** Перейти к произвольному фрагменту — используется навигацией по главам. */
  goTo(index: number): void {
    this.jump(index);
  }

  private jump(to: number): void {
    this.index = Math.min(Math.max(to, 0), Math.max(this.chunks.length - 1, 0));
    this.synth.cancel();
    this.emit();
    if (this.status === 'playing') this.speakCurrent();
  }

  setRate(rate: number): void {
    this.rate = clampRate(rate);
    this.emit();
    if (this.status === 'playing') {
      this.synth.cancel();
      this.speakCurrent();
    }
  }
}
