import { isOwl2 } from "./odoo.js";

/**
 * @typedef {Object} TreeEntry
 * @property {any} component  OWL component instance or legacy widget
 * @property {Element|null} el  root element, null when not an element
 * @property {number} depth
 * @property {TreeEntry|null} parent
 */

function owl2Element(node) {
    let first;
    try {
        first = node.firstNode();
    } catch {
        return null;
    }
    // Components whose first node is text (fragments, portals) are skipped:
    // their next element sibling may belong to another component.
    return first && first.nodeType === Node.ELEMENT_NODE ? first : null;
}

/**
 * Every component of the app, OWL 2 (16+) or OWL 1 (15), with its root
 * element and its parent entry.
 * @returns {TreeEntry[]}
 */
export function collectComponents(root) {
    if (!root?.__owl__) {
        return [];
    }
    const owl2 = isOwl2(root);
    const entries = [];
    const stack = [{ component: root, depth: 0, parent: null }];
    while (stack.length) {
        const entry = stack.pop();
        const owl = entry.component.__owl__;
        if (owl2) {
            entry.el = owl2Element(owl);
        } else {
            entry.el = entry.component.el instanceof Element ? entry.component.el : null;
        }
        entries.push(entry);
        const children = owl?.children ? Object.values(owl.children) : [];
        for (const child of children) {
            const component = owl2 ? child?.component : child;
            if (component) {
                stack.push({ component, depth: entry.depth + 1, parent: entry });
            }
        }
    }
    return entries;
}

function isLegacyWidget(value) {
    return Boolean(
        value && typeof value === "object" && Array.isArray(value.__parentedChildren)
    );
}

/** Legacy widgets hosted by OWL adapters (15, and some views of 16). */
export function legacyRootWidgets(entries) {
    const roots = new Set();
    for (const { component } of entries) {
        for (const candidate of [component.widget, component.__widget]) {
            if (isLegacyWidget(candidate)) {
                roots.add(candidate);
            }
        }
    }
    return [...roots];
}

/** Every legacy widget under `roots`, following getChildren(). */
export function collectLegacyWidgets(roots) {
    const entries = [];
    const seen = new Set();
    const stack = roots.map((widget) => ({ component: widget, depth: 0, parent: null }));
    while (stack.length) {
        const entry = stack.pop();
        if (seen.has(entry.component)) {
            continue;
        }
        seen.add(entry.component);
        entry.el = entry.component.el instanceof Element ? entry.component.el : null;
        entries.push(entry);
        for (const child of entry.component.__parentedChildren || []) {
            stack.push({ component: child, depth: entry.depth + 1, parent: entry });
        }
    }
    return entries;
}

export function containing(entries, target) {
    return entries.filter((entry) => entry.el && (entry.el === target || entry.el.contains(target)));
}

/**
 * Sorts entries whose elements all contain the same target from the most
 * specific (deepest element) to the least. Entries sharing an element are
 * ordered by tree depth.
 */
export function innermostFirst(entries) {
    return [...entries].sort((a, b) => {
        if (a.el === b.el) {
            return b.depth - a.depth;
        }
        return a.el.contains(b.el) ? 1 : -1;
    });
}

export function ancestors(entry) {
    const result = [];
    for (let current = entry.parent; current; current = current.parent) {
        result.push(current);
    }
    return result;
}

/** Sorts elements in document order. */
export function inDocumentOrder(entries) {
    return [...entries].sort((a, b) =>
        a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    );
}
