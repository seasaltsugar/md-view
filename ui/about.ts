import { ISSUES_URL, PRIVACY_URL, REPO_URL } from '../lib/config';
import { getVersion } from '../lib/appInfo';
import { byId } from './dom';
import type { SupportController } from './supportNote';

/** The About dialog: what MD View is, the privacy promise, version and links. */
export function initAbout(support: SupportController) {
  const dialog = byId<HTMLDialogElement>('ui-about');
  const checkbox = byId<HTMLInputElement>('ui-about-reminders');
  const menuItem = byId('ui-reminders-menu');

  byId('ui-about-version').textContent = getVersion();
  byId<HTMLAnchorElement>('ui-about-privacy').href = PRIVACY_URL;
  byId<HTMLAnchorElement>('ui-about-repo').href = REPO_URL;
  byId<HTMLAnchorElement>('ui-about-issues').href = ISSUES_URL;

  const syncReminders = (enabled: boolean) => {
    checkbox.checked = enabled;
    menuItem.setAttribute('aria-checked', String(enabled));
  };
  syncReminders(support.remindersEnabled());
  support.onRemindersChanged(syncReminders);
  checkbox.addEventListener('change', () => support.setRemindersEnabled(checkbox.checked));
  menuItem.addEventListener('click', () => support.setRemindersEnabled(!support.remindersEnabled()));

  const open = () => {
    if (!dialog.open) dialog.showModal();
  };
  byId('ui-about-open').addEventListener('click', open);
  byId('ui-about-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close(); // click on the backdrop
  });

  return { open, isOpen: () => dialog.open };
}
