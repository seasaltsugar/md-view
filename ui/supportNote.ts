import { SUPPORT_ENABLED, SUPPORT_URL } from '../lib/config';
import type { KeyValueStore } from '../lib/prefs';
import {
  getRemindersEnabled,
  loadSupportState,
  recordDocumentOpened,
  saveSupportState,
  setRemindersEnabled,
  shouldShowSupportReminder,
  snoozeReminder,
} from '../lib/support';
import { byId } from './dom';

/**
 * Support links, the optional reminder and the "Show support reminders" setting.
 *
 * - Everything here is local. Nothing is sent anywhere.
 * - The reminder is a small card, never a modal, and it never blocks reading.
 * - Showing it counts as using up the reminder: it will not come back for at least
 *   SUPPORT_SNOOZE_OPENS more documents, whether or not it was dismissed.
 */
export function createSupport(store: KeyValueStore) {
  let state = loadSupportState(store);
  const listeners = new Set<(enabled: boolean) => void>();

  const note = byId('ui-support-note');
  const title = byId('ui-support-note-title');

  const hideNote = () => {
    note.hidden = true;
  };

  const setEnabled = (enabled: boolean) => {
    setRemindersEnabled(store, enabled);
    listeners.forEach((fn) => fn(enabled));
  };

  if (SUPPORT_ENABLED) {
    for (const id of ['ui-support-menu-link', 'ui-support-note-link', 'ui-about-support-link']) {
      byId<HTMLAnchorElement>(id).href = SUPPORT_URL;
    }
    byId('ui-support-menu-link').hidden = false;
    byId('ui-reminders-menu').hidden = false;
    byId('ui-about-support').hidden = false;
  }

  byId('ui-support-later').addEventListener('click', hideNote);
  byId('ui-support-note-link').addEventListener('click', hideNote);
  byId('ui-support-never').addEventListener('click', () => {
    setEnabled(false);
    hideNote();
  });

  return {
    available: SUPPORT_ENABLED,
    remindersEnabled: () => getRemindersEnabled(store),
    setRemindersEnabled: setEnabled,
    onRemindersChanged(fn: (enabled: boolean) => void) {
      listeners.add(fn);
    },
    /** Call once after each document has been opened successfully. */
    documentOpened() {
      state = recordDocumentOpened(state);
      hideNote();
      if (shouldShowSupportReminder(state, getRemindersEnabled(store), SUPPORT_ENABLED)) {
        title.textContent = `You’ve viewed ${state.opens} Markdown files with MD View.`;
        note.hidden = false;
        state = snoozeReminder(state);
      }
      saveSupportState(store, state);
    },
  };
}

export type SupportController = ReturnType<typeof createSupport>;
