import { describe, it, expect } from 'vitest';
import {
  MODES,
  STORAGE_KEY,
  modeFromPath,
  pathForMode,
  resolveMode,
  readStoredMode,
  applyMode,
} from '@/lib/mode';

describe('маршруты режимов', () => {
  it('сопоставляет путь и режим', () => {
    expect(modeFromPath('/')).toBe('standard');
    expect(modeFromPath('/audio')).toBe('audio');
    expect(modeFromPath('/accessible')).toBe('accessible');
  });

  it('терпит завершающий слэш', () => {
    expect(modeFromPath('/audio/')).toBe('audio');
  });

  it('возвращает null на неизвестном пути', () => {
    expect(modeFromPath('/nope')).toBeNull();
  });

  it('строит путь по режиму', () => {
    expect(MODES.map(pathForMode)).toEqual(['/', '/audio', '/accessible']);
  });
});

describe('чтение сохранённого режима', () => {
  const stub = (v: string | null) => ({ getItem: () => v });

  it('читает валидное значение', () => {
    expect(readStoredMode(stub('audio'))).toBe('audio');
  });

  it('отбрасывает мусор', () => {
    expect(readStoredMode(stub('hacker'))).toBeNull();
    expect(readStoredMode(stub(null))).toBeNull();
  });

  it('использует согласованный ключ', () => {
    expect(STORAGE_KEY).toBe('esq-mode');
  });
});

describe('разрешение режима', () => {
  it('путь важнее всего остального', () => {
    expect(resolveMode({ pathname: '/audio', stored: 'accessible', prefersContrast: true })).toBe(
      'audio',
    );
  });

  it('на корне берёт сохранённый режим', () => {
    expect(resolveMode({ pathname: '/', stored: 'accessible', prefersContrast: false })).toBe(
      'accessible',
    );
  });

  it('без сохранённого режима уважает системный контраст', () => {
    expect(resolveMode({ pathname: '/', stored: null, prefersContrast: true })).toBe('accessible');
  });

  it('по умолчанию стандартный', () => {
    expect(resolveMode({ pathname: '/', stored: null, prefersContrast: false })).toBe('standard');
  });
});

describe('применение режима к документу', () => {
  it('проставляет data-mode', () => {
    const doc = document.implementation.createHTMLDocument();
    applyMode(doc, 'accessible');
    expect(doc.documentElement.dataset.mode).toBe('accessible');
  });
});
