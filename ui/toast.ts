import { byId } from './dom';

/** Short confirmation shown in a polite live region (also announced to screen readers). */
export function showToast(message: string, ms = 2400): void {
  const region = byId('ui-toasts');
  while (region.childElementCount >= 3) region.firstElementChild?.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  region.appendChild(toast);
  window.setTimeout(() => toast.remove(), ms);
}

/** A persistent, dismissible message for problems the person should read (role="alert"). */
export function showError(message: string): void {
  byId('ui-error-text').textContent = message;
  byId('ui-error').hidden = false;
}

export function hideError(): void {
  byId('ui-error').hidden = true;
}
