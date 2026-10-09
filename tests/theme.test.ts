import { describe, expect, it } from 'vitest';
import { createMemoryStore } from '../lib/prefs';
import {
  THEME_KEY,
  applyTheme,
  isThemePreference,
  loadThemePreference,
  resolveTheme,
  saveThemePreference,
} from '../lib/theme';

describe('theme preference', () => {
  it('defaults to "system"', () => {
    expect(loadThemePreference(createMemoryStore())).toBe('system');
  });

  it('remembers the saved choice', () => {
    const store = createMemoryStore();
    saveThemePreference(store, 'dark');
    expect(loadThemePreference(store)).toBe('dark');
    saveThemePreference(store, 'light');
    expect(loadThemePreference(store)).toBe('light');
  });

  it('ignores unknown stored values', () => {
    const store = createMemoryStore({ [THEME_KEY]: 'sepia' });
    expect(loadThemePreference(store)).toBe('system');
    expect(isThemePreference('sepia')).toBe(false);
    expect(isThemePreference('dark')).toBe(true);
  });

  it('follows the operating system when set to "system"', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('applies the choice to the page, leaving "system" to prefers-color-scheme', () => {
    const root = document.createElement('html');
    applyTheme('dark', root);
    expect(root.getAttribute('data-theme')).toBe('dark');
    applyTheme('system', root);
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(root.getAttribute('data-theme-preference')).toBe('system');
  });
});
