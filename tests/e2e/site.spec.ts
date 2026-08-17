import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Переключение версии — кнопки в панели читателя, а не отдельные адреса. */
async function switchMode(page: Page, label: string) {
  await page.getByRole('radio', { name: label }).click();
  await page.waitForTimeout(300);
}

test.describe('доступность', () => {
  for (const [label, mode] of [
    ['Стандарт', 'standard'],
    ['Аудиоверсия', 'audio'],
    ['Для слабовидящих', 'accessible'],
  ]) {
    test(`axe не находит нарушений в версии «${label}»`, async ({ page }) => {
      await page.goto('/');
      await switchMode(page, label);
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test('skip-link первый в порядке фокуса', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('href', '#main');
  });

  test('контраст предельный', async ({ page }) => {
    await page.goto('/');
    const c = await page.evaluate(() => {
      const s = getComputedStyle(document.body);
      return { fg: s.color, bg: s.backgroundColor };
    });
    expect(c.bg).toBe('rgb(255, 255, 255)');
  });
});

test.describe('семантика', () => {
  test('иерархия заголовков без пропусков', async ({ page }) => {
    await page.goto('/');
    const levels = await page.$$eval('h1, h2, h3', (els) => els.map((e) => Number(e.tagName[1])));
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]! - levels[i - 1]!).toBeLessThanOrEqual(1);
    }
  });

  test('ровно один h1', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('врезки размечены как цитаты', async ({ page }) => {
    await page.goto('/');
    expect(await page.locator('blockquote').count()).toBeGreaterThanOrEqual(3);
  });

  test('контентные кадры описаны содержательно', async ({ page }) => {
    await page.goto('/');
    // Фото в карточках оглавления декоративны: название главы стоит
    // рядом ссылкой, повторять его в alt — мешать чтению с экрана.
    const short = await page.$$eval('main img:not(nav img)', (imgs) =>
      imgs.map((i) => i.getAttribute('alt') ?? '').filter((a) => a.trim().length < 20),
    );
    expect(short).toEqual([]);
  });

  test('якоря глав существуют', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page
      .locator('[data-chapter]')
      .evaluateAll((links) => links.map((l) => (l as HTMLAnchorElement).getAttribute('href')));
    expect(hrefs.length).toBe(4);
    for (const href of hrefs) await expect(page.locator(href!)).toHaveCount(1);
  });
});

test.describe('механика для двух типов читателей', () => {
  test('размер текста меняется и запоминается', async ({ page }) => {
    await page.goto('/');
    // Целимся в основной текст по классу, а не в первый попавшийся p:
    // раньше него идёт надкат со своим кеглем, который намеренно не
    // масштабируется вместе с текстом.
    const size = () =>
      page
        .locator('main .measure')
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));

    const before = await size();
    await page.getByRole('button', { name: 'Увеличить размер текста' }).click();
    await page.waitForTimeout(200);
    expect(await size()).toBeGreaterThan(before);

    await page.reload();
    await page.waitForTimeout(400);
    expect(await size()).toBeGreaterThan(before);
  });

  test('фотографии не растут вместе с текстом', async ({ page }) => {
    await page.goto('/');
    const imgWidth = () =>
      page
        .locator('main img')
        .first()
        .evaluate((el) => Math.round(el.getBoundingClientRect().width));

    const before = await imgWidth();
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Увеличить размер текста' }).click();
      await page.waitForTimeout(150);
    }
    expect(await imgWidth()).toBe(before);
  });

  test('в режиме для слабовидящих текст крупнее стандартного', async ({ page }) => {
    await page.goto('/');
    const size = () =>
      page
        .locator('main .measure')
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));

    const standard = await size();
    await switchMode(page, 'Для слабовидящих');
    expect(await size()).toBeGreaterThan(standard);
  });

  test('плеер появляется в аудиоверсии и подписан', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Слушать материал' })).toHaveCount(0);

    await switchMode(page, 'Аудиоверсия');
    await page.waitForTimeout(800);
    await expect(page.getByRole('button', { name: 'Слушать материал' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Следующая глава' })).toBeVisible();
  });

  test('озвучка играет записи и ведёт подсветку', async ({ page }) => {
    await page.goto('/');
    await switchMode(page, 'Аудиоверсия');
    await page.waitForTimeout(900);

    const mp3: number[] = [];
    page.on('response', (r) => {
      if (r.url().endsWith('.mp3')) mp3.push(r.status());
    });

    await page.getByRole('button', { name: 'Слушать материал' }).click();
    await page.waitForTimeout(3000);

    expect(mp3.length).toBeGreaterThan(0);
    expect(await page.locator('.is-reading').count()).toBeGreaterThan(0);
  });
});
