import type { MD, StateCore, Token } from './types';

/**
 * GitHub-style task lists:  - [ ] todo   - [x] done
 * Renders a disabled checkbox. Marked list items get `task-list-item`; their list gets `contains-task-list`.
 */
const MARKER = /^\[([ xX])\][ \u00a0]+/;

export default function taskLists(md: MD): void {
  md.core.ruler.push('task_lists', (state: StateCore) => {
    const tokens = state.tokens;
    for (let i = 2; i < tokens.length; i++) {
      const inline = tokens[i];
      if (
        inline.type !== 'inline' ||
        tokens[i - 1].type !== 'paragraph_open' ||
        tokens[i - 2].type !== 'list_item_open'
      ) {
        continue;
      }
      const first = inline.children?.[0];
      const match = first && first.type === 'text' ? MARKER.exec(first.content) : null;
      if (!first || !match) continue;

      const checked = match[1].toLowerCase() === 'x';
      first.content = first.content.slice(match[0].length);

      const box = new state.Token('html_inline', '', 0) as Token;
      box.content = `<input class="task-list-item-checkbox" type="checkbox" disabled${checked ? ' checked' : ''}> `;
      inline.children!.unshift(box);

      tokens[i - 2].attrJoin('class', 'task-list-item');
      const list = findParentList(tokens, i - 2);
      list?.attrJoin('class', 'contains-task-list');
    }
  });
}

function findParentList(tokens: Token[], itemIndex: number): Token | null {
  const level = tokens[itemIndex].level - 1;
  for (let i = itemIndex - 1; i >= 0; i--) {
    const token = tokens[i];
    if (token.level === level && (token.type === 'bullet_list_open' || token.type === 'ordered_list_open')) {
      return token;
    }
  }
  return null;
}
