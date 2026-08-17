export type Mode = 'standard' | 'audio' | 'accessible';

export const MODES: readonly Mode[] = ['standard', 'audio', 'accessible'] as const;

export const STORAGE_KEY = 'esq-mode';

const PATHS: Record<Mode, string> = {
  standard: '/',
  audio: '/audio',
  accessible: '/accessible',
};

export const MODE_LABELS: Record<Mode, string> = {
  standard: 'Стандарт',
  audio: 'Аудиоверсия',
  accessible: 'Для слабовидящих',
};

function isMode(value: unknown): value is Mode {
  return typeof value === 'string' && (MODES as readonly string[]).includes(value);
}

export function pathForMode(mode: Mode): string {
  return PATHS[mode];
}

export function modeFromPath(pathname: string): Mode | null {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const found = MODES.find((m) => PATHS[m] === clean);
  return found ?? null;
}

export function readStoredMode(storage: Pick<Storage, 'getItem'>): Mode | null {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return isMode(raw) ? raw : null;
  } catch {
    return null;
  }
}

export interface ResolveInput {
  pathname: string;
  stored: Mode | null;
  prefersContrast: boolean;
}

export function resolveMode({ pathname, stored, prefersContrast }: ResolveInput): Mode {
  const fromPath = modeFromPath(pathname);
  if (fromPath && fromPath !== 'standard') return fromPath;
  if (stored) return stored;
  if (prefersContrast) return 'accessible';
  return 'standard';
}

export function applyMode(doc: Document, mode: Mode): void {
  doc.documentElement.dataset.mode = mode;
}
