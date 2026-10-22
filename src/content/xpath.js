/**
 * XPath and inheritance snippets computed on the combined arch of a view,
 * so the expression works whatever module added the node.
 */

const SUBVIEW_TAGS = ["list", "tree", "form", "kanban", "graph", "pivot", "calendar"];
// Ancestors that can anchor an expression through a stable attribute.
const ANCHOR_ATTRIBUTES = ["name", "id"];

export function parseArch(arch) {
    const doc = new DOMParser().parseFromString(arch, "text/xml");
    if (doc.querySelector("parsererror")) {
        throw new Error("The view arch could not be parsed");
    }
    return doc;
}

function literal(value) {
    if (!value.includes("'")) {
        return `'${value}'`;
    }
    if (!value.includes('"')) {
        return `"${value}"`;
    }
    return `concat('${value.split("'").join(`', "'", '`)}')`;
}

function evaluate(doc, expression) {
    try {
        const result = doc.evaluate(expression, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        const nodes = [];
        for (let i = 0; i < result.snapshotLength; i++) {
            nodes.push(result.snapshotItem(i));
        }
        return nodes;
    } catch {
        return [];
    }
}

function stepFor(element) {
    const tag = element.tagName;
    for (const attribute of ANCHOR_ATTRIBUTES) {
        const value = element.getAttribute(attribute);
        if (value) {
            return `${tag}[@${attribute}=${literal(value)}]`;
        }
    }
    return null;
}

/**
 * Predicates that can tell apart nodes with the same name. Translatable
 * attributes (string, help, title) are never used: they change with the
 * language. hasclass() is Odoo's (lxml) function; the browser checks the
 * equivalent expression.
 */
function predicates(node) {
    const result = [];
    for (const attribute of ["id", "type", "widget"]) {
        const value = node.getAttribute(attribute);
        if (value && !(attribute === "id" && stepFor(node)?.startsWith(`${node.tagName}[@id=`))) {
            const predicate = `[@${attribute}=${literal(value)}]`;
            result.push({ odoo: predicate, browser: predicate });
        }
    }
    for (const token of (node.getAttribute("class") || "").split(/\s+/).filter(Boolean)) {
        result.push({
            odoo: `[hasclass(${literal(token)})]`,
            browser: `[contains(concat(' ', normalize-space(@class), ' '), ${literal(` ${token} `)})]`,
        });
    }
    return result;
}

/**
 * Shortest expression that matches `node` and only `node`. Adds named
 * ancestors one at a time. A subview tag (list/form/kanban) always goes with
 * its x2many field: `order_line/list` and `order_line/form` stay distinct and
 * another module adding a list elsewhere does not break the expression.
 */
export function buildXpath(doc, node) {
    const own = stepFor(node) || node.tagName;
    // Closest first.
    const anchors = [];
    for (let current = node.parentElement; current && current !== doc.documentElement; current = current.parentElement) {
        if (SUBVIEW_TAGS.includes(current.tagName) && current.parentElement?.tagName === "field") {
            anchors.push({ step: current.tagName, direct: true });
            continue;
        }
        const step = stepFor(current);
        if (step) {
            anchors.push({ step, direct: false });
        }
    }
    const compose = (count) => {
        const parts = anchors.slice(0, count).reverse();
        const prefix = parts.map((part, index) => (index && part.direct ? "/" : "//") + part.step).join("");
        return `${prefix}//${own}`;
    };
    const isUnique = (expression) => {
        const nodes = evaluate(doc, expression);
        return nodes.length === 1 && nodes[0] === node;
    };
    // Inside an x2many subview, the expression always starts at least at
    // that x2many field.
    const firstSubview = anchors.findIndex((anchor) => anchor.direct);
    const minCount = firstSubview >= 0 ? Math.min(firstSubview + 2, anchors.length) : 0;
    const candidates = [];
    for (let count = minCount; count <= anchors.length; count++) {
        if (count > 0 && anchors[count - 1].direct) {
            continue;
        }
        candidates.push(compose(count));
    }
    for (const candidate of candidates) {
        if (isUnique(candidate)) {
            return candidate;
        }
    }
    // Same name more than once in the same place.
    const extras = predicates(node);
    for (const candidate of candidates) {
        for (const extra of extras) {
            if (isUnique(candidate + extra.browser)) {
                return candidate + extra.odoo;
            }
        }
    }
    // Last resort: position among the matches of the narrowest expression.
    const narrowest = candidates[candidates.length - 1];
    const index = evaluate(doc, narrowest).indexOf(node);
    return index >= 0 ? `(${narrowest})[${index + 1}]` : narrowest;
}

/**
 * Field nodes named `name`. With an x2many path, only the ones inside that
 * x2many's subviews; without it, only top-level ones (not inside a subview).
 */
export function findFieldNodes(doc, name, path = [], tag = "field") {
    let scopes = [doc.documentElement];
    for (const step of path) {
        const next = [];
        for (const scope of scopes) {
            for (const candidate of scope.querySelectorAll(`field[name="${CSS.escape(step.name)}"]`)) {
                next.push(candidate);
            }
        }
        scopes = next.filter((candidate) => !next.some((other) => other !== candidate && other.contains(candidate)));
        if (!scopes.length) {
            return [];
        }
    }
    const result = [];
    for (const scope of scopes) {
        for (const candidate of scope.querySelectorAll(`${tag}[name="${CSS.escape(name)}"]`)) {
            // Skip nodes that belong to a deeper subview than the requested path.
            let owner = candidate.parentElement;
            let nestedField = null;
            while (owner && owner !== scope) {
                if (owner.tagName === "field") {
                    nestedField = owner;
                    break;
                }
                owner = owner.parentElement;
            }
            if (!nestedField) {
                result.push(candidate);
            }
        }
    }
    // The subview the user was looking at (list, kanban) comes first.
    const viewMode = path.length ? path[path.length - 1].viewMode : null;
    if (viewMode) {
        const tags = viewMode === "list" ? ["list", "tree"] : [viewMode];
        const inMode = (node) => {
            for (let current = node.parentElement; current; current = current.parentElement) {
                if (SUBVIEW_TAGS.includes(current.tagName) && current.parentElement?.tagName === "field") {
                    return tags.includes(current.tagName);
                }
            }
            return false;
        };
        result.sort((a, b) => Number(inMode(b)) - Number(inMode(a)));
    }
    return result;
}

function hasSpecAncestor(element) {
    for (let current = element.parentElement; current; current = current.parentElement) {
        if (current.tagName === "xpath" || current.hasAttribute("position")) {
            return true;
        }
    }
    return false;
}

function targetsName(spec, name) {
    if (spec.tagName === "xpath") {
        const expr = spec.getAttribute("expr") || "";
        return expr.includes(`'${name}'`) || expr.includes(`"${name}"`);
    }
    return spec.getAttribute("name") === name;
}

/**
 * Which views add the node and which modify it, from their own arch_db.
 * @param {Array<{id, xml_id, name, arch_db, inherit_id}>} views
 */
export function nodeHistory(views, name, tag = "field") {
    const addedBy = [];
    const modifiedBy = [];
    for (const view of views) {
        let doc;
        try {
            doc = parseArch(view.arch_db || "<data/>");
        } catch {
            continue;
        }
        // A view with a parent only contains specs (xpath, position=...).
        const isExtension = Boolean(view.inherit_id);
        let added = false;
        for (const element of doc.querySelectorAll(`${tag}[name="${CSS.escape(name)}"]`)) {
            if (element.hasAttribute("position")) {
                continue;
            }
            if (!isExtension || hasSpecAncestor(element)) {
                added = true;
            }
        }
        if (added) {
            addedBy.push(view);
        }
        if (isExtension) {
            const specs = [...doc.querySelectorAll("xpath, [position]")].filter((spec) => targetsName(spec, name));
            const positions = [...new Set(specs.map((spec) => spec.getAttribute("position") || "inside"))];
            if (positions.length) {
                modifiedBy.push({ view, positions });
            }
        }
    }
    return { addedBy, modifiedBy };
}

const BODIES = {
    after: (indent) => `${indent}<field name="new_field"/>`,
    before: (indent) => `${indent}<field name="new_field"/>`,
    inside: (indent) => `${indent}<field name="new_field"/>`,
    replace: (indent, node) => `${indent}<${node.tag} name="${node.name}"/>`,
    attributes: (indent) => `${indent}<attribute name="invisible">1</attribute>`,
};

/**
 * Inheritance record for a view.
 * @param {Object} params
 * @param {string|null} params.inheritXmlId xml id of the view to inherit
 * @param {number} params.inheritId database id, used when there is no xml id
 * @param {string} params.model
 * @param {string} params.viewType
 * @param {string} params.xpath
 * @param {{tag: string, name: string}} params.node
 * @param {string} params.position
 * @param {boolean} params.short use <field name="x" position="..."> when possible
 */
export function inheritanceSnippet({ inheritXmlId, inheritId, model, viewType, xpath, node, position, short }) {
    const base = inheritXmlId ? inheritXmlId.split(".").pop() : `view_${model.replace(/\./g, "_")}_${viewType}`;
    const recordId = `${base}_inherit`;
    const inheritLine = inheritXmlId
        ? `    <field name="inherit_id" ref="${inheritXmlId}"/>`
        : `    <!-- This view has no external id: inherit it by database id -->\n    <field name="inherit_id" eval="${inheritId}"/>`;
    const simple = new RegExp(`^//${node.tag}\\[@name='${node.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'\\]$`);
    const useShort = short && simple.test(xpath);
    const open = useShort
        ? `<${node.tag} name="${node.name}" position="${position}">`
        : `<xpath expr="${xpath.replace(/"/g, "&quot;")}" position="${position}">`;
    const close = useShort ? `</${node.tag}>` : "</xpath>";
    const body = (BODIES[position] || BODIES.after)("            ", node);
    return [
        `<record id="${recordId}" model="ir.ui.view">`,
        `    <field name="name">${model}.${viewType}.inherit</field>`,
        `    <field name="model">${model}</field>`,
        inheritLine,
        `    <field name="arch" type="xml">`,
        `        ${open}`,
        body,
        `        ${close}`,
        `    </field>`,
        `</record>`,
    ].join("\n");
}

/** Indented copy of an arch, for display. */
export function prettyXml(arch) {
    const doc = parseArch(arch);
    const lines = [];
    const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const attrs = (element) =>
        [...element.attributes].map((a) => ` ${a.name}="${escape(a.value).replace(/"/g, "&quot;")}"`).join("");
    const walk = (node, depth) => {
        const indent = "    ".repeat(depth);
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            if (text) {
                lines.push(indent + escape(text));
            }
            return;
        }
        if (node.nodeType === Node.COMMENT_NODE) {
            lines.push(`${indent}<!--${node.textContent}-->`);
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return;
        }
        const children = [...node.childNodes].filter(
            (child) => child.nodeType !== Node.TEXT_NODE || child.textContent.trim()
        );
        if (!children.length) {
            lines.push(`${indent}<${node.tagName}${attrs(node)}/>`);
        } else if (children.length === 1 && children[0].nodeType === Node.TEXT_NODE) {
            lines.push(`${indent}<${node.tagName}${attrs(node)}>${escape(children[0].textContent.trim())}</${node.tagName}>`);
        } else {
            lines.push(`${indent}<${node.tagName}${attrs(node)}>`);
            children.forEach((child) => walk(child, depth + 1));
            lines.push(`${indent}</${node.tagName}>`);
        }
    };
    walk(doc.documentElement, 0);
    return lines.join("\n");
}
