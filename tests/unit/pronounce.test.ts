import { describe, it, expect } from 'vitest';
import { forSpeech, findUntranslated } from '@/lib/pronounce';

describe('произношение латиницы', () => {
  it('заменяет составные названия целиком', () => {
    expect(forSpeech('Отслеживание пульса с помощью Apple Watch')).toContain('Эпл В+отч');
    expect(forSpeech('MacBook Neo объединяет скорость')).toContain('Макб+ук Н+эо');
  });

  it('составное имя не распадается на части', () => {
    const out = forSpeech('Apple Watch');
    expect(out).not.toContain('Watch');
    expect(out.match(/Эпл/g)).toHaveLength(1);
  });

  it('заменяет одиночные названия', () => {
    expect(forSpeech('держит iPhone')).toContain('Айф+он');
    expect(forSpeech('Сканер LiDAR считывает')).toContain('Лид+ар');
    expect(forSpeech('удобство macOS')).toContain('мак-о-+эс');
  });

  it('не оставляет латиницы в текстах материала', () => {
    const samples = [
      'Пожилой мужчина держит перед собой iPhone',
      'Сканер LiDAR считывает мир в реальном времени',
      'Отслеживание пульса с помощью Apple Watch бережет здоровью минуты',
      'MacBook Neo объединяет фирменную скорость и удобство macOS',
      'портрет человека в тёмных очках с надписью Smooth Operator',
    ];
    for (const s of samples) expect(findUntranslated(s)).toEqual([]);
  });

  it('не трогает обычный русский текст', () => {
    const text = 'Обычно мы замечаем неудобства только тогда, когда сами с ними сталкиваемся';
    expect(forSpeech(text)).toContain('неудобства');
  });
});

describe('ударения', () => {
  it('проставляет ё там, где словарь читает е', () => {
    expect(forSpeech('бережет здоровью минуты')).toContain('береж+ёт');
  });

  it('снимает двусмысленность в спорных словах', () => {
    expect(forSpeech('не должно быть посредников')).toContain('поср+едников');
  });

  it('не трогает «все» во множественном числе', () => {
    // В тексте есть «все эти надписи» — подмена на «всё» исказила бы смысл.
    expect(forSpeech('что все эти надписи размыты')).toContain('все эти');
  });

  it('работает с кириллицей, где обычная граница слова не срабатывает', () => {
    expect(forSpeech('сбережет')).toBe('сбережет');
    expect(forSpeech('бережет')).toBe('береж+ёт');
  });
});
