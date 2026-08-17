import { describe, it, expect } from 'vitest';
import { landing } from '@/content/landing';

describe('контент лендинга', () => {
  it('содержит 13 блоков', () => {
    expect(landing.blocks).toHaveLength(13);
  });

  it('содержит ровно 4 главы', () => {
    expect(landing.chapters).toHaveLength(4);
  });

  it('у каждого блока непустой id и известный kind', () => {
    const kinds = ['hero', 'intro', 'nav', 'chapter', 'quote', 'body', 'outro'];
    for (const b of landing.blocks) {
      expect(b.id).toBeTruthy();
      expect(kinds).toContain(b.kind);
    }
  });

  it('ни один абзац не пустой и не обрезан многоточием', () => {
    for (const b of landing.blocks) {
      for (const p of b.paragraphs) {
        expect(p.text.length).toBeGreaterThan(0);
        expect(p.text.endsWith('…')).toBe(false);
      }
    }
  });

  it('идентификаторы абзацев уникальны', () => {
    const ids = landing.blocks.flatMap((b) => b.paragraphs.map((p) => p.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
