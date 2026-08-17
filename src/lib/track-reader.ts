import type { ReaderState, ReaderStatus, SpeechChunk } from './speech';
import { clampRate, POSITION_KEY } from './speech';

/**
 * Проигрыватель заранее сгенерированной озвучки.
 *
 * Речь синтезируется один раз при сборке, поэтому все слышат одинаковый
 * голос независимо от браузера и операционной системы — в отличие от
 * синтеза на лету, где на Windows обычно достаётся бедный системный
 * голос, а кое-где русского нет вовсе.
 *
 * Разбиение то же, что у синтеза: один фрагмент — один файл. Благодаря
 * этому подсветка попадает точно в читаемое место без словарных таймингов.
 */
export class TrackReader {
  private chunks: SpeechChunk[];
  private files: Record<string, string>;
  private audio: HTMLAudioElement;
  private index = 0;
  private rate = 1;
  private status: ReaderStatus = 'idle';
  private onChange: (state: ReaderState) => void;

  private onProgress?: (progress: number) => void;
  private frame = 0;

  constructor(
    chunks: SpeechChunk[],
    files: Record<string, string>,
    onChange: (state: ReaderState) => void,
    onProgress?: (progress: number) => void,
  ) {
    this.chunks = chunks;
    this.files = files;
    this.onChange = onChange;
    this.onProgress = onProgress;
    this.audio = new Audio();
    this.audio.preload = 'none';

    this.audio.addEventListener('ended', () => {
      if (this.status !== 'playing') return;
      if (this.index + 1 >= this.chunks.length) {
        this.status = 'idle';
        this.index = 0;
        this.emit();
        return;
      }
      this.index += 1;
      this.emit();
      void this.load();
    });

    // Битый или отсутствующий файл не должен обрывать прослушивание:
    // пропускаем фрагмент и идём дальше.
    this.audio.addEventListener('error', () => {
      if (this.status !== 'playing') return;
      if (this.index + 1 >= this.chunks.length) {
        this.status = 'idle';
        this.emit();
        return;
      }
      this.index += 1;
      this.emit();
      void this.load();
    });

    this.index = this.restore();
  }

  /**
   * Доля проигранного фрагмента — по ней ведётся подсветка слов.
   *
   * Опрос идёт кадрами, а не по событию timeupdate: браузер шлёт его
   * раз в 200–250 мс, и подсветка заметно дёргалась бы.
   */
  private tick = (): void => {
    if (this.status !== 'playing') return;
    const { currentTime, duration } = this.audio;
    if (duration > 0) this.onProgress?.(currentTime / duration);
    this.frame = requestAnimationFrame(this.tick);
  };

  private startTicker(): void {
    if (!this.onProgress) return;
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(this.tick);
  }

  private stopTicker(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  /** Есть ли готовый файл хотя бы для части фрагментов. */
  static hasTracks(files: Record<string, string> | null): files is Record<string, string> {
    return !!files && Object.keys(files).length > 0;
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

  private emit(): void {
    this.persist();
    this.onChange(this.getState());
  }

  getState(): ReaderState {
    return { status: this.status, index: this.index, total: this.chunks.length, rate: this.rate };
  }

  private async load(): Promise<void> {
    const chunk = this.chunks[this.index];
    const src = chunk ? this.files[chunk.id] : undefined;
    if (!src) {
      this.audio.dispatchEvent(new Event('error'));
      return;
    }
    this.audio.src = src;
    this.audio.playbackRate = this.rate;
    try {
      await this.audio.play();
    } catch {
      // Браузер может отклонить автозапуск — состояние честно сбрасываем.
      this.status = 'paused';
      this.emit();
    }
  }

  play(): void {
    if (this.status === 'playing') return;
    this.status = 'playing';
    this.emit();
    this.startTicker();
    void this.load();
  }

  pause(): void {
    this.status = 'paused';
    this.audio.pause();
    this.stopTicker();
    this.emit();
  }

  next(): void {
    this.goTo(this.index + 1);
  }

  prev(): void {
    this.goTo(this.index - 1);
  }

  goTo(to: number): void {
    this.index = Math.min(Math.max(to, 0), this.chunks.length - 1);
    this.audio.pause();
    this.emit();
    if (this.status === 'playing') void this.load();
  }

  setRate(rate: number): void {
    this.rate = clampRate(rate);
    this.audio.playbackRate = this.rate;
    this.emit();
  }

  stop(): void {
    this.status = 'idle';
    this.audio.pause();
    this.stopTicker();
    this.audio.removeAttribute('src');
  }
}
