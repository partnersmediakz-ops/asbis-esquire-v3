/**
 * Масштаб текста, управляемый читателем.
 *
 * Шаги подобраны так, чтобы каждый следующий заметно отличался от
 * предыдущего: мелкие приращения бесполезны тому, ради кого это делается.
 * Верхняя граница — двукратный размер: дальше основной текст перестаёт
 * помещаться в строку даже на широком экране.
 */
export const SCALE_STEPS = [1, 1.25, 1.5, 1.75, 2] as const;

export type ScaleStep = (typeof SCALE_STEPS)[number];

export const SCALE_KEY = 'esq-fs-scale';

export const DEFAULT_SCALE: ScaleStep = 1;

export function isScale(value: unknown): value is ScaleStep {
  return typeof value === 'number' && (SCALE_STEPS as readonly number[]).includes(value);
}

/** Ближайший допустимый шаг: защищает от произвольных значений в хранилище. */
export function nearestStep(value: number): ScaleStep {
  return SCALE_STEPS.reduce<ScaleStep>(
    (best, step) => (Math.abs(step - value) < Math.abs(best - value) ? step : best),
    DEFAULT_SCALE,
  );
}

export function stepIndex(value: ScaleStep): number {
  return SCALE_STEPS.indexOf(value);
}

/** Соседний шаг. За краями диапазона возвращает текущий, а не зацикливает. */
export function shiftStep(value: ScaleStep, direction: -1 | 1): ScaleStep {
  const next = stepIndex(value) + direction;
  if (next < 0 || next >= SCALE_STEPS.length) return value;
  return SCALE_STEPS[next]!;
}

export function readStoredScale(storage: Pick<Storage, 'getItem'>): ScaleStep {
  try {
    const raw = storage.getItem(SCALE_KEY);
    if (raw === null) return DEFAULT_SCALE;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? nearestStep(parsed) : DEFAULT_SCALE;
  } catch {
    return DEFAULT_SCALE;
  }
}

export function applyScale(doc: Document, value: ScaleStep): void {
  doc.documentElement.style.setProperty('--fs-scale', String(value));
}

/** Подпись для читателя: «150 %». */
export function scaleLabel(value: ScaleStep): string {
  return `${Math.round(value * 100)} %`;
}
