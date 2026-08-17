import { execFile } from 'node:child_process';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

const SRC = 'src/assets/figma';
const OUT = 'src/assets/web';

/**
 * Оригиналы из макета — исходники в полном разрешении: двадцать кадров
 * весят 87 МБ. На диске это неважно, в браузере — смертельно: страница
 * не догружается, а всё, что запрошено после картинок (в том числе
 * манифест озвучки), стоит в очереди за ними.
 *
 * Поэтому оригиналы остаются в репозитории как источник правды, а в
 * сборку идёт их веб-версия. Ширина ограничена сверху: больше двух
 * тысяч точек макет всё равно нигде не показывает, даже на экране с
 * двойной плотностью.
 */
const MAX_WIDTH = 2000;
const QUALITY = 80;

async function convert(name) {
  const from = join(SRC, name);
  const to = join(OUT, name.replace(/\.png$/i, '.webp'));

  // Пересобираем только устаревшее: конвертация двадцати кадров идёт
  // минуты, а меняются они редко.
  try {
    const [a, b] = await Promise.all([stat(from), stat(to)]);
    if (b.mtimeMs >= a.mtimeMs) return { to, skipped: true };
  } catch {
    /* веб-версии ещё нет — просто делаем */
  }

  await run('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-i',
    from,
    // Уменьшаем только то, что шире предела: апскейла быть не должно.
    '-vf',
    `scale='min(${MAX_WIDTH},iw)':-2:flags=lanczos`,
    '-quality',
    String(QUALITY),
    to,
  ]);

  return { to, skipped: false };
}

const names = (await readdir(SRC)).filter((n) => n.toLowerCase().endsWith('.png'));
await mkdir(OUT, { recursive: true });

let before = 0;
let after = 0;
let made = 0;

for (const name of names) {
  const { to, skipped } = await convert(name);
  before += (await stat(join(SRC, name))).size;
  after += (await stat(to)).size;
  if (!skipped) made++;
}

// Список веб-версий нужен сборщику: он подставит хешированные пути,
// а разметка обращается к кадрам по идентификатору узла из макета.
await writeFile(
  join(OUT, '.gitkeep'),
  'Собирается из ../figma скриптом scripts/optimize-images.mjs\n',
);

const mb = (n) => (n / 1024 / 1024).toFixed(1);
console.log(
  `Кадров: ${names.length} (пересобрано ${made}). ${mb(before)} МБ → ${mb(after)} МБ`,
);
