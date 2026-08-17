/**
 * Реестр видеороликов.
 *
 * Ключ — идентификатор главы или узла Figma, значение — путь к файлу
 * в public/video. Пока роликов нет, реестр пуст: компоненты показывают
 * статичный кадр и оформительскую кнопку воспроизведения.
 *
 * Чтобы подключить ролик, достаточно положить файл в public/video и
 * добавить сюда строку — вёрстку и стили менять не нужно. Кнопка
 * воспроизведения сама станет рабочим органом управления, а кадр из
 * Figma останется постером на время загрузки.
 *
 * Пример:
 *   'chapter-1': '/video/chapter-1.mp4',
 *   '197:351':   '/video/hero.mp4',
 */
export const VIDEOS: Record<string, string> = {};

/** Путь к ролику для ключа, если он объявлен. */
export function videoFor(key: string | undefined): string | undefined {
  if (!key) return undefined;
  return VIDEOS[key];
}

/** Есть ли хоть один объявленный ролик. */
export function hasAnyVideo(): boolean {
  return Object.keys(VIDEOS).length > 0;
}
