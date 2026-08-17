import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:5173' },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
  // Сборка идёт до запуска — см. npm-скрипт test:e2e. Playwright поднимает
  // только preview: составную команду «build && preview» он на Windows не
  // может убить целиком и виснет на завершении.
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:5173',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
