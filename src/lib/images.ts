import manifest from '../assets/figma/manifest.json';

/**
 * Кадры отдаются как URL, а не как объекты метаданных: сборщик сам
 * подставит хешированные пути и положит файлы в выдачу.
 */
const modules = import.meta.glob<string>('../assets/figma/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

const byFile = new Map<string, string>();
for (const [path, url] of Object.entries(modules)) {
  byFile.set(path.split('/').pop()!, url);
}

/**
 * Один и тот же снимок стоит в макете в нескольких узлах с разными id.
 * Манифест связывает каждый узел с файлом — без этого узел-дубликат
 * остаётся без картинки и молча выпадает из вёрстки.
 */
const files = manifest as Record<string, string>;

export function hasImage(figmaId: string): boolean {
  const file = files[figmaId];
  return !!file && byFile.has(file);
}

export function image(figmaId: string): string {
  const file = files[figmaId];
  const url = file ? byFile.get(file) : undefined;
  if (!url) throw new Error(`Нет изображения для узла ${figmaId}`);
  return url;
}
