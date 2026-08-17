import { describe, it, expect } from 'vitest';
import {
  SCALE_STEPS,
  SCALE_KEY,
  DEFAULT_SCALE,
  isScale,
  nearestStep,
  shiftStep,
  readStoredScale,
  applyScale,
  scaleLabel,
} from '@/lib/text-scale';

describe('шаги масштаба', () => {
  it('идут по возрастанию от обычного до двукратного', () => {
    expect(SCALE_STEPS[0]).toBe(1);
    expect(SCALE_STEPS[SCALE_STEPS.length - 1]).toBe(2);
    for (let i = 1; i < SCALE_STEPS.length; i++) {
      expect(SCALE_STEPS[i]!).toBeGreaterThan(SCALE_STEPS[i - 1]!);
    }
  });

  it('распознаёт допустимое значение', () => {
    expect(isScale(1.5)).toBe(true);
    expect(isScale(1.3)).toBe(false);
    expect(isScale('1.5')).toBe(false);
  });

  it('подтягивает произвольное значение к ближайшему шагу', () => {
    expect(nearestStep(1.3)).toBe(1.25);
    expect(nearestStep(99)).toBe(2);
    expect(nearestStep(-5)).toBe(1);
  });
});

describe('переключение шага', () => {
  it('идёт вверх и вниз', () => {
    expect(shiftStep(1, 1)).toBe(1.25);
    expect(shiftStep(1.5, -1)).toBe(1.25);
  });

  it('на краях остаётся на месте, а не зацикливается', () => {
    expect(shiftStep(1, -1)).toBe(1);
    expect(shiftStep(2, 1)).toBe(2);
  });
});

describe('хранение', () => {
  const stub = (v: string | null) => ({ getItem: () => v });

  it('читает сохранённое значение', () => {
    expect(readStoredScale(stub('1.5'))).toBe(1.5);
  });

  it('без значения отдаёт обычный размер', () => {
    expect(readStoredScale(stub(null))).toBe(DEFAULT_SCALE);
  });

  it('мусор не ломает страницу', () => {
    expect(readStoredScale(stub('огромный'))).toBe(DEFAULT_SCALE);
    expect(readStoredScale(stub('1.31'))).toBe(1.25);
  });

  it('использует согласованный ключ', () => {
    expect(SCALE_KEY).toBe('esq-fs-scale');
  });
});

describe('применение и подпись', () => {
  it('проставляет переменную на документ', () => {
    const doc = document.implementation.createHTMLDocument();
    applyScale(doc, 1.75);
    expect(doc.documentElement.style.getPropertyValue('--fs-scale')).toBe('1.75');
  });

  it('подпись в процентах', () => {
    expect(scaleLabel(1)).toBe('100 %');
    expect(scaleLabel(1.5)).toBe('150 %');
  });
});
