import { describe, expect, it } from 'vitest';
import { SUPPORT_FIRST_PROMPT_AT, SUPPORT_SNOOZE_OPENS } from '../lib/config';
import { createMemoryStore } from '../lib/prefs';
import {
  INITIAL_SUPPORT_STATE,
  SUPPORT_STATE_KEY,
  getRemindersEnabled,
  loadSupportState,
  recordDocumentOpened,
  saveSupportState,
  setRemindersEnabled,
  shouldShowSupportReminder,
  snoozeReminder,
  type SupportState,
} from '../lib/support';

function openMany(state: SupportState, times: number): SupportState {
  let next = state;
  for (let i = 0; i < times; i++) next = recordDocumentOpened(next);
  return next;
}

describe('support reminder threshold', () => {
  it('uses 20 opens and a 50-open snooze', () => {
    expect(SUPPORT_FIRST_PROMPT_AT).toBe(20);
    expect(SUPPORT_SNOOZE_OPENS).toBe(50);
  });

  it('stays hidden for a new installation and during the first sessions', () => {
    expect(shouldShowSupportReminder(INITIAL_SUPPORT_STATE, true)).toBe(false);
    expect(shouldShowSupportReminder(openMany(INITIAL_SUPPORT_STATE, 19), true)).toBe(false);
  });

  it('appears once the 20th document has been opened', () => {
    expect(shouldShowSupportReminder(openMany(INITIAL_SUPPORT_STATE, 20), true)).toBe(true);
  });

  it('never appears when reminders are turned off or no support link is configured', () => {
    const state = openMany(INITIAL_SUPPORT_STATE, 500);
    expect(shouldShowSupportReminder(state, false)).toBe(false);
    expect(shouldShowSupportReminder(state, true, false)).toBe(false);
  });
});

describe('support reminder dismissal', () => {
  it('"Not now" hides it for at least 50 more opens', () => {
    let state = snoozeReminder(openMany(INITIAL_SUPPORT_STATE, 20));
    expect(state.nextPromptAt).toBe(70);
    expect(shouldShowSupportReminder(state, true)).toBe(false);

    state = openMany(state, 49);
    expect(state.opens).toBe(69);
    expect(shouldShowSupportReminder(state, true)).toBe(false);

    state = recordDocumentOpened(state);
    expect(shouldShowSupportReminder(state, true)).toBe(true);
  });

  it('shows at most once per snooze period even if never dismissed', () => {
    let state = openMany(INITIAL_SUPPORT_STATE, 20);
    let shown = 0;
    for (let i = 0; i < 100; i++) {
      state = recordDocumentOpened(state);
      if (shouldShowSupportReminder(state, true)) {
        shown++;
        state = snoozeReminder(state); // the app snoozes as soon as the note is displayed
      }
    }
    expect(shown).toBe(2); // opens 21 and 71 — not 80 times
  });

  it('can be disabled permanently', () => {
    const store = createMemoryStore();
    expect(getRemindersEnabled(store)).toBe(true);
    setRemindersEnabled(store, false);
    expect(getRemindersEnabled(store)).toBe(false);
    const state = openMany(INITIAL_SUPPORT_STATE, 1000);
    expect(shouldShowSupportReminder(state, getRemindersEnabled(store))).toBe(false);
  });
});

describe('support state storage', () => {
  it('round-trips through local storage', () => {
    const store = createMemoryStore();
    saveSupportState(store, { opens: 33, nextPromptAt: 70 });
    expect(loadSupportState(store)).toEqual({ opens: 33, nextPromptAt: 70 });
  });

  it('recovers from corrupt data', () => {
    for (const bad of ['not json', '{"opens":"many"}', '{"opens":-5,"nextPromptAt":null}', '[]']) {
      const store = createMemoryStore({ [SUPPORT_STATE_KEY]: bad });
      const state = loadSupportState(store);
      expect(state.opens).toBe(0);
      expect(state.nextPromptAt).toBe(SUPPORT_FIRST_PROMPT_AT);
    }
  });
});
