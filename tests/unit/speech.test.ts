import { describe, it, expect } from 'vitest';
import { collectChunks, isSpeechSupported, clampRate, pickRussianVoice } from '@/lib/speech';

function makeDom(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

const voice = (name: string, lang: string, localService = true) =>
  ({ name, lang, localService }) as SpeechSynthesisVoice;

describe('сбор фрагментов для озвучки', () => {
  it('идёт в порядке документа', () => {
    const dom = makeDom(`
      <p data-speech="a">Первый</p>
      <p data-speech="b">Второй</p>
    `);
    expect(collectChunks(dom).map((c) => c.plain)).toEqual(['Первый', 'Второй']);
  });

  it('пропускает пустые', () => {
    const dom = makeDom('<p data-speech="a">   </p><p data-speech="b">Есть</p>');
    expect(collectChunks(dom).map((c) => c.plain)).toEqual(['Есть']);
  });

  it('схлопывает пробелы и переносы', () => {
    const dom = makeDom('<p data-speech="a">Много\n   пробелов</p>');
    expect(collectChunks(dom)[0]!.plain).toBe('Много пробелов');
  });

  it('читает заголовки, а не только абзацы', () => {
    const dom = makeDom(`
      <h1>Просто жить</h1>
      <p data-speech="a">Текст</p>
      <h2>Свобода двигаться вперед</h2>
    `);
    expect(collectChunks(dom).map((c) => c.role)).toEqual(['title', 'body', 'heading']);
  });

  it('поясняет роль фрагмента вслух, но не в подсветке', () => {
    const dom = makeDom('<h2>Свобода двигаться вперед</h2>');
    const [chunk] = collectChunks(dom);
    expect(chunk!.text).toBe('Глава. Свобода двигаться вперед');
    expect(chunk!.plain).toBe('Свобода двигаться вперед');
  });

  it('описывает фотографии по их alt', () => {
    const dom = makeDom('<img alt="Мужчина с телефоном в парке" src="x.png">');
    const [chunk] = collectChunks(dom);
    expect(chunk!.role).toBe('image');
    expect(chunk!.text).toBe('Фотография. Мужчина с телефоном в парке');
  });

  it('пропускает декоративные изображения и скрытые блоки', () => {
    const dom = makeDom(`
      <img alt="" src="decor.png">
      <div aria-hidden="true"><p data-speech="x">Декор</p></div>
      <p data-speech="y">Содержание</p>
    `);
    expect(collectChunks(dom).map((c) => c.plain)).toEqual(['Содержание']);
  });

  it('не повторяет один и тот же текст дважды', () => {
    const dom = makeDom(`
      <blockquote><p class="quote__text" data-speech="q">Одна фраза</p></blockquote>
    `);
    expect(collectChunks(dom).filter((c) => c.plain === 'Одна фраза')).toHaveLength(1);
  });
});

describe('поддержка синтеза речи', () => {
  it('определяется наличием speechSynthesis', () => {
    expect(isSpeechSupported({})).toBe(false);
    expect(isSpeechSupported({ speechSynthesis: {} as SpeechSynthesis })).toBe(true);
  });
});

describe('ограничение скорости', () => {
  it('держит значение в допустимых пределах', () => {
    expect(clampRate(0.1)).toBe(0.75);
    expect(clampRate(9)).toBe(1.5);
    expect(clampRate(1.25)).toBe(1.25);
  });
});

describe('выбор русского голоса', () => {
  it('возвращает null, если русских голосов нет', () => {
    expect(pickRussianVoice([voice('Alex', 'en-US')])).toBeNull();
  });

  it('предпочитает улучшенный голос обычному', () => {
    const picked = pickRussianVoice([
      voice('Milena', 'ru-RU'),
      voice('Milena (Enhanced)', 'ru-RU'),
    ]);
    expect(picked?.name).toBe('Milena (Enhanced)');
  });

  it('предпочитает известный системный голос безымянному', () => {
    const picked = pickRussianVoice([voice('Microsoft Irina', 'ru-RU'), voice('Milena', 'ru-RU')]);
    expect(picked?.name).toBe('Milena');
  });

  it('предпочитает локальный голос удалённому при прочих равных', () => {
    const picked = pickRussianVoice([
      voice('Голос A', 'ru-RU', false),
      voice('Голос Б', 'ru-RU', true),
    ]);
    expect(picked?.name).toBe('Голос Б');
  });

  it('понимает код языка с регионом в любом регистре', () => {
    expect(pickRussianVoice([voice('Кто-то', 'RU-ru')])).not.toBeNull();
  });
});
