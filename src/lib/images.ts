import manifest from '../assets/figma/manifest.json';

/**
 * Кадры отдаются как URL, а не как объекты метаданных: сборщик сам
 * подставит хешированные пути и положит файлы в выдачу.
 *
 * Берём веб-версии, а не оригиналы из макета: те весят 87 МБ на двадцать
 * кадров, и страница с ними просто не догружается — вместе с картинками
 * в очереди застревает и всё остальное, вплоть до манифеста озвучки.
 * Оригиналы лежат рядом как источник правды, см. scripts/optimize-images.mjs.
 */
const modules = import.meta.glob<string>('../assets/web/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

const byFile = new Map<string, string>();
for (const [path, url] of Object.entries(modules)) {
  byFile.set(path.split('/').pop()!, url);
}

/** Манифест составлен по оригиналам — сопоставляем с их веб-версией. */
const webName = (file: string) => file.replace(/\.png$/i, '.webp');

/**
 * Один и тот же снимок стоит в макете в нескольких узлах с разными id.
 * Манифест связывает каждый узел с файлом — без этого узел-дубликат
 * остаётся без картинки и молча выпадает из вёрстки.
 */
const files = manifest as Record<string, string>;

export function hasImage(figmaId: string): boolean {
  const file = files[figmaId];
  return !!file && byFile.has(webName(file));
}

export function image(figmaId: string): string {
  const file = files[figmaId];
  const url = file ? byFile.get(webName(file)) : undefined;
  if (!url) throw new Error(`Нет изображения для узла ${figmaId}`);
  return url;
}
