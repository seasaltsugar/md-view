export interface TocEntry {
  id: string;
  level: number;
  text: string;
}

export interface TocNode extends TocEntry {
  children: TocNode[];
}

export interface TocOptions {
  minLevel?: number;
  maxLevel?: number;
}

/**
 * Builds a nested outline from a flat heading list (H1–H4 by default).
 * Skipped levels (H1 → H3) nest naturally under the nearest shallower heading.
 */
export function buildToc(headings: readonly TocEntry[], options: TocOptions = {}): TocNode[] {
  const { minLevel = 1, maxLevel = 4 } = options;
  const roots: TocNode[] = [];
  const stack: TocNode[] = [];

  for (const heading of headings) {
    if (heading.level < minLevel || heading.level > maxLevel) continue;
    const node: TocNode = { id: heading.id, level: heading.level, text: heading.text, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) stack.pop();
    (stack.length > 0 ? stack[stack.length - 1].children : roots).push(node);
    stack.push(node);
  }
  return roots;
}

/** Renders the outline as nested <ul> lists of in-page links. */
export function renderTocList(nodes: readonly TocNode[], doc: Document = document): HTMLUListElement {
  const list = doc.createElement('ul');
  for (const node of nodes) {
    const item = doc.createElement('li');
    const link = doc.createElement('a');
    link.href = `#${encodeURIComponent(node.id)}`;
    link.textContent = node.text || 'Untitled section';
    link.className = 'toc-link';
    link.dataset.id = node.id;
    link.dataset.level = String(node.level);
    item.appendChild(link);
    if (node.children.length > 0) item.appendChild(renderTocList(node.children, doc));
    list.appendChild(item);
  }
  return list;
}
