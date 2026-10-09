import { SUPPORT_FIRST_PROMPT_AT, SUPPORT_SNOOZE_OPENS } from './config';
import { getBoolean, setBoolean, type KeyValueStore } from './prefs';

/**
 * Support-reminder logic. Pure functions plus tiny load/save helpers.
 *
 * Privacy: `opens` is just a number kept on this computer. It is never transmitted and
 * never used for analytics. It only decides whether to show one small, dismissible note.
 */
export interface SupportState {
  /** How many documents have been opened successfully. */
  opens: number;
  /** The reminder may appear once `opens` reaches this value. */
  nextPromptAt: number;
}

export const SUPPORT_STATE_KEY = 'support';
export const SHOW_REMINDERS_KEY = 'show-support-reminders';

export const INITIAL_SUPPORT_STATE: SupportState = {
  opens: 0,
  nextPromptAt: SUPPORT_FIRST_PROMPT_AT,
};

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function loadSupportState(store: KeyValueStore): SupportState {
  const raw = store.get(SUPPORT_STATE_KEY);
  if (!raw) return { ...INITIAL_SUPPORT_STATE };
  try {
    const parsed = JSON.parse(raw) as Partial<SupportState>;
    return {
      opens: isCount(parsed.opens) ? Math.floor(parsed.opens) : 0,
      nextPromptAt: isCount(parsed.nextPromptAt) ? Math.floor(parsed.nextPromptAt) : SUPPORT_FIRST_PROMPT_AT,
    };
  } catch {
    return { ...INITIAL_SUPPORT_STATE };
  }
}

export function saveSupportState(store: KeyValueStore, state: SupportState): void {
  store.set(SUPPORT_STATE_KEY, JSON.stringify(state));
}

/** Call once per successfully rendered document. */
export function recordDocumentOpened(state: SupportState): SupportState {
  return { ...state, opens: state.opens + 1 };
}

/**
 * The reminder is shown only when ALL are true:
 * reminders are switched on, a support link exists, and the threshold has been reached.
 */
export function shouldShowSupportReminder(
  state: SupportState,
  remindersEnabled: boolean,
  supportAvailable: boolean = true,
): boolean {
  return remindersEnabled && supportAvailable && state.opens >= state.nextPromptAt;
}

/**
 * Snooze: stay quiet for at least SUPPORT_SNOOZE_OPENS more opens.
 * Used when the reminder is shown (so it never repeats) and again when "Not now" is chosen.
 */
export function snoozeReminder(state: SupportState): SupportState {
  return { ...state, nextPromptAt: state.opens + SUPPORT_SNOOZE_OPENS };
}

export function getRemindersEnabled(store: KeyValueStore): boolean {
  return getBoolean(store, SHOW_REMINDERS_KEY, true);
}

export function setRemindersEnabled(store: KeyValueStore, enabled: boolean): void {
  setBoolean(store, SHOW_REMINDERS_KEY, enabled);
}
