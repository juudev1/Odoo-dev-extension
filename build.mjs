import { context, build } from "esbuild";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildManifest } from "./src/manifest.js";
import messages from "./src/shared/messages.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
        const [key, value = true] = arg.replace(/^--/, "").split("=");
        return [key, value];
    })
);
const target = args.target || "chrome";
const watch = Boolean(args.watch);
const outdir = path.join(root, "build", target);
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));

const esbuildTarget = target === "firefox" ? ["firefox128"] : ["chrome111"];

/** @type {import("esbuild").BuildOptions} */
const options = {
    entryPoints: {
        page: "src/page/index.js",
        content: "src/content/index.jsx",
        "popup/popup": "src/popup/popup.jsx",
    },
    outdir,
    bundle: true,
    format: "iife",
    target: esbuildTarget,
    // Store reviewers read the code: keep it readable.
    minify: false,
    sourcemap: watch ? "inline" : false,
    jsx: "automatic",
    jsxImportSource: "preact",
    loader: { ".css": "text" },
    define: { __VERSION__: JSON.stringify(pkg.version) },
    logLevel: "info",
};

const LANGUAGES = ["en", "es"];

async function sourceFiles(dir) {
    const files = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await sourceFiles(full)));
        } else if (/\.(js|jsx)$/.test(entry.name)) {
            files.push(full);
        }
    }
    return files;
}

/** Fails the build when the code uses a text key that messages.js lacks. */
async function checkMessages() {
    const missing = new Set();
    for (const file of await sourceFiles(path.join(root, "src"))) {
        const code = await readFile(file, "utf8");
        for (const [, key] of code.matchAll(/\bt\("([A-Za-z0-9_]+)"/g)) {
            if (!messages[key]) {
                missing.add(`${key} (${path.relative(root, file)})`);
            }
        }
    }
    for (const [key, texts] of Object.entries(messages)) {
        for (const language of LANGUAGES) {
            if (!texts[language]) {
                missing.add(`${key}: no "${language}" text`);
            }
        }
    }
    if (missing.size) {
        throw new Error(`Missing texts:\n  ${[...missing].join("\n  ")}`);
    }
}

/**
 * chrome.i18n wants named placeholders: "$1" in messages.js becomes "$p1$"
 * with a placeholder whose content is the first substitution.
 */
async function writeLocales() {
    for (const language of LANGUAGES) {
        const catalog = {};
        for (const [key, texts] of Object.entries(messages)) {
            const text = texts[language];
            const indexes = [...new Set([...text.matchAll(/\$(\d)/g)].map((match) => match[1]))];
            const entry = { message: text.replace(/\$(\d)/g, "$p$1$") };
            if (indexes.length) {
                entry.placeholders = Object.fromEntries(indexes.map((index) => [`p${index}`, { content: `$${index}` }]));
            }
            catalog[key] = entry;
        }
        const dir = path.join(outdir, "_locales", language);
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, "messages.json"), JSON.stringify(catalog, null, 4) + "\n");
    }
}

async function writeStatic() {
    await cp(path.join(root, "public"), outdir, { recursive: true });
    await writeLocales();
    await cp(path.join(root, "src/popup/popup.html"), path.join(outdir, "popup/popup.html"));
    const manifest = buildManifest(target, pkg.version);
    await writeFile(path.join(outdir, "manifest.json"), JSON.stringify(manifest, null, 4) + "\n");
}

await checkMessages();
await rm(outdir, { recursive: true, force: true });
await mkdir(path.join(outdir, "popup"), { recursive: true });

if (watch) {
    const ctx = await context({
        ...options,
        plugins: [
            {
                name: "static-files",
                setup(b) {
                    b.onEnd(() => writeStatic());
                },
            },
        ],
    });
    await ctx.watch();
    console.log(`Watching… load ${path.relative(root, outdir)} as an unpacked extension.`);
} else {
    await build(options);
    await writeStatic();
    console.log(`Built ${target} extension in ${path.relative(root, outdir)}`);
}
