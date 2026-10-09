/**
 * Accessible dropdown menus (role="menu"): arrow keys, Home/End, Escape, outside click.
 */
export interface MenuController {
  open(focusItem?: 'first' | 'last' | null): void;
  close(restoreFocus?: boolean): void;
  isOpen(): boolean;
}

const openMenus = new Set<MenuController>();

/** Closes every open menu. Returns true if one was open. */
export function closeAllMenus(): boolean {
  const any = openMenus.size > 0;
  for (const menu of Array.from(openMenus)) menu.close(true);
  return any;
}

export function initMenu(button: HTMLElement, panel: HTMLElement): MenuController {
  const visibleItems = () =>
    Array.from(panel.querySelectorAll<HTMLElement>('[role^="menuitem"]')).filter((el) => el.offsetParent !== null);

  const focusAt = (index: number) => {
    const items = visibleItems();
    if (items.length === 0) return;
    items[(index + items.length) % items.length].focus();
  };

  const controller: MenuController = {
    isOpen: () => !panel.hidden,
    open(focusItem = null) {
      for (const other of Array.from(openMenus)) if (other !== controller) other.close(false);
      panel.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      openMenus.add(controller);
      if (focusItem === 'first') focusAt(0);
      if (focusItem === 'last') focusAt(-1);
    },
    close(restoreFocus = false) {
      if (panel.hidden) return;
      panel.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      openMenus.delete(controller);
      if (restoreFocus) button.focus();
    },
  };

  button.addEventListener('click', (event) => {
    if (controller.isOpen()) controller.close(false);
    else controller.open(event.detail === 0 ? 'first' : null); // keyboard activation focuses the first item
  });

  button.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      controller.open('first');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      controller.open('last');
    }
  });

  panel.addEventListener('keydown', (event) => {
    const items = visibleItems();
    const index = items.indexOf(document.activeElement as HTMLElement);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusAt(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusAt(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusAt(0);
        break;
      case 'End':
        event.preventDefault();
        focusAt(-1);
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        controller.close(true);
        break;
      case 'Tab':
        controller.close(false);
        break;
    }
  });

  // Choosing an item closes the menu; keep keyboard focus somewhere sensible.
  panel.addEventListener('click', (event) => {
    if (!(event.target as Element).closest('[role^="menuitem"]')) return;
    controller.close(false);
    queueMicrotask(() => {
      const active = document.activeElement;
      if (!document.querySelector('dialog[open]') && (!active || active === document.body)) button.focus();
    });
  });

  document.addEventListener('pointerdown', (event) => {
    const target = event.target as Node;
    if (controller.isOpen() && !panel.contains(target) && !button.contains(target)) controller.close(false);
  });

  return controller;
}
