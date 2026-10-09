import { AppError } from './errors';

/**
 * Copies text to the clipboard. Needs no extension permission because it is only ever
 * called from a click or key press. Falls back to a hidden textarea if the async API
 * is refused.
 */
export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    /* fall through to the legacy path */
  }

  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.setAttribute('aria-hidden', 'true');
  area.className = 'clipboard-buffer';
  document.body.appendChild(area);
  const previouslyFocused = document.activeElement as HTMLElement | null;
  try {
    area.select();
    if (!document.execCommand('copy')) throw new Error('copy command rejected');
  } catch {
    throw new AppError('clipboard', 'MD View couldn’t copy to the clipboard. Select the text and press Ctrl+C or ⌘C instead.');
  } finally {
    area.remove();
    previouslyFocused?.focus?.();
  }
}
