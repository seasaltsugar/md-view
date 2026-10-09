import { DocumentSearch, type SearchStatus } from '../lib/search';
import { byId, debounce } from './dom';

/** The search row under the toolbar: query, previous/next, result count. */
export function createSearchBar(getRoot: () => Element | null) {
  const app = byId('ui-app');
  const bar = byId('ui-searchbar');
  const input = byId<HTMLInputElement>('ui-search-input');
  const count = byId('ui-search-count');
  const search = new DocumentSearch(getRoot);

  const render = (status: SearchStatus) => {
    if (!status.query.trim()) count.textContent = '';
    else if (status.count === 0) count.textContent = 'No results';
    else count.textContent = `${status.current} of ${status.count}${status.truncated ? '+' : ''}`;
  };

  const runNow = () => render(search.run(input.value));
  const runSoon = debounce(runNow, 120);

  const controller = {
    isOpen: () => !bar.hidden,
    open() {
      bar.hidden = false;
      app.dataset.search = 'open';
      input.focus();
      input.select();
      if (input.value) runNow();
    },
    close() {
      if (bar.hidden) return;
      bar.hidden = true;
      app.dataset.search = 'closed';
      search.clear();
      render(search.status());
    },
    /** Re-run after the view changed (collapse, rendered/source switch, new document). */
    refresh() {
      if (bar.hidden || !input.value.trim()) return;
      render(search.run(input.value, true));
    },
    step(direction: 1 | -1) {
      render(search.step(direction));
    },
  };

  input.addEventListener('input', runSoon);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (search.status().query !== input.value) runNow();
      else controller.step(event.shiftKey ? -1 : 1);
    }
  });
  byId('ui-search-prev').addEventListener('click', () => controller.step(-1));
  byId('ui-search-next').addEventListener('click', () => controller.step(1));
  byId('ui-search-close').addEventListener('click', () => controller.close());
  byId('ui-search-toggle').addEventListener('click', () => (controller.isOpen() ? controller.close() : controller.open()));

  return controller;
}

export type SearchBarController = ReturnType<typeof createSearchBar>;
