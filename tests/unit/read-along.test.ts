import { describe, it, expect } from 'vitest';
import { splitWords, buildTimeline, wordAt, ReadAlong } from '@/lib/read-along';

function make(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

describe('разбиение на слова', () => {
  it('делит текст и сохраняет пробелы настоящими', () => {
    const el = make('<p>Просто жить сегодня</p>').firstElementChild as HTMLElement;
    const words = splitWords(el);
    expect(words.map((w) => w.textContent)).toEqual(['Просто', 'жить', 'сегодня']);
    expect(el.textContent).toBe('Просто жить сегодня');
  });

  it('не режет разметку повторно', () => {
    const el = make('<p>Одно два</p>').firstElementChild as HTMLElement;
    const first = splitWords(el);
    const second = splitWords(el);
    expect(second).toHaveLength(first.length);
    expect(el.textContent).toBe('Одно два');
  });

  it('переиспользует слова анимации заголовков', () => {
    const el = make('<h2><span><span data-rv>Свобода</span></span> <span><span data-rv>идти</span></span></h2>')
      .firstElementChild as HTMLElement;
    expect(splitWords(el).map((w) => w.textContent)).toEqual(['Свобода', 'идти']);
  });

  it('не спотыкается о пустой текст', () => {
    const el = make('<p>   </p>').firstElementChild as HTMLElement;
    expect(splitWords(el)).toEqual([]);
  });
});

describe('раскладка по времени', () => {
  it('длинному слову отводит больше времени, чем короткому', () => {
    const el = make('<p>и безопасности</p>').firstElementChild as HTMLElement;
    const slots = buildTimeline(splitWords(el));
    const first = slots[0]!.end - slots[0]!.start;
    const second = slots[1]!.end - slots[1]!.start;
    expect(second).toBeGreaterThan(first * 5);
  });

  it('покрывает фрагмент целиком и без разрывов', () => {
    const el = make('<p>раз два три четыре</p>').firstElementChild as HTMLElement;
    const slots = buildTimeline(splitWords(el));
    expect(slots[0]!.start).toBe(0);
    expect(slots[slots.length - 1]!.end).toBeCloseTo(1, 5);
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i]!.start).toBeCloseTo(slots[i - 1]!.end, 5);
    }
  });
});

describe('поиск текущего слова', () => {
  const slots = (text: string) =>
    buildTimeline(splitWords(make(`<p>${text}</p>`).firstElementChild as HTMLElement));

  it('в начале и в конце', () => {
    const s = slots('раз два три');
    expect(wordAt(s, 0)).toBe(0);
    expect(wordAt(s, 1)).toBe(2);
  });

  it('за границами не выходит за пределы списка', () => {
    const s = slots('раз два');
    expect(wordAt(s, -5)).toBe(0);
    expect(wordAt(s, 99)).toBe(1);
  });

  it('на пустом фрагменте возвращает -1', () => {
    expect(wordAt([], 0.5)).toBe(-1);
  });
});

describe('подсветка', () => {
  it('переносит метку с одного слова на другое', () => {
    const el = make('<p>раз два три</p>').firstElementChild as HTMLElement;
    const reader = new ReadAlong();
    expect(reader.attach(el)).toBe(3);

    reader.setProgress(0);
    expect(el.querySelectorAll('.is-current-word')).toHaveLength(1);
    const first = el.querySelector('.is-current-word')!.textContent;

    reader.setProgress(0.99);
    expect(el.querySelectorAll('.is-current-word')).toHaveLength(1);
    expect(el.querySelector('.is-current-word')!.textContent).not.toBe(first);
  });

  it('после сброса подсветки не остаётся', () => {
    const el = make('<p>раз два</p>').firstElementChild as HTMLElement;
    const reader = new ReadAlong();
    reader.attach(el);
    reader.setProgress(0.5);
    reader.clear();
    expect(el.querySelectorAll('.is-current-word')).toHaveLength(0);
  });
});
