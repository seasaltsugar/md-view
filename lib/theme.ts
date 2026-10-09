import { type KeyValueStore } from './prefs';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_KEY = 'theme';
export const THEME_CHOICES: readonly ThemePreference[] = ['system', 'light', 'dark'];

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

/** "System" follows the operating system / browser setting. */
export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}

export function loadThemePreference(store: KeyValueStore): ThemePreference {
  const value = store.get(THEME_KEY);
  return isThemePreference(value) ? value : 'system';
}

export function saveThemePreference(store: KeyValueStore, preference: ThemePreference): void {
  store.set(THEME_KEY, preference);
}

/**
 * Applies the preference to the page.
 * - "system": no attribute; the stylesheet's prefers-color-scheme rules decide.
 * - "light" / "dark": forces that theme via data-theme.
 */
export function applyTheme(preference: ThemePreference, root: HTMLElement = document.documentElement): void {
  if (preference === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', preference);
  root.setAttribute('data-theme-preference', preference);
}
