// Fails the build if the client banner is missing, React context leaks into a
// server-safe bundle, Markdoc is bundled or imported by name, or an entry does
// not load in plain Node.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const dist = path.resolve(import.meta.dirname, "..", "dist");
const bundles = fs.readdirSync(dist).filter((f) => /\.(esm\.js|cjs)$/.test(f));
const problems = [];

const MARKDOC = "@markdoc/markdoc";
// `import { Tag } from "@markdoc/markdoc"` or `import Markdoc, { Tag } from ...`: Node cannot
// import names from Markdoc's CommonJS build, so an ESM bundle may only use the default export.
const namedMarkdocImport = /import\s+(?:[\w$]+\s*,\s*)?(?:\{[^}]*\}|\*\s*as\s+[\w$]+)\s*from\s*["']@markdoc\/markdoc["']/;
let usesMarkdoc = false;

for (const file of bundles) {
  const source = fs.readFileSync(path.join(dist, file), "utf8");
  const isClient = /^client\./.test(file);
  const hasBanner = source.startsWith('"use client";');
  if (isClient && !hasBanner) problems.push(`${file}: missing the "use client" banner`);
  if (!isClient && hasBanner) problems.push(`${file}: must not have the "use client" banner`);
  if (!isClient && /\b(createContext|useContext)\b/.test(source)) problems.push(`${file}: uses React context`);
  if (source.includes(`require('${MARKDOC}')`) || source.includes(`from '${MARKDOC}'`)) usesMarkdoc = true;
  if (namedMarkdocImport.test(source)) problems.push(`${file}: imports names from ${MARKDOC}; read them from its default export`);
}
if (!bundles.some((f) => /^client\./.test(f))) problems.push("no client bundle in dist");
if (!usesMarkdoc) problems.push(`no bundle loads ${MARKDOC}: it must stay external, not be bundled`);

// Every entry must load with `require` and with `import` in plain Node.
const require = createRequire(import.meta.url);
for (const file of bundles.filter((f) => !f.startsWith("shared-"))) {
  const target = path.join(dist, file);
  try {
    if (file.endsWith(".cjs")) require(target);
    else await import(pathToFileURL(target).href);
  } catch (error) {
    const message = error instanceof Error ? error.message.split("\n")[0] : String(error);
    problems.push(`${file}: does not load in Node (${message})`);
  }
}

if (problems.length) {
  console.error(`check-dist failed:\n${problems.map((p) => `  ${p}`).join("\n")}`);
  process.exit(1);
}
console.log(`check-dist: ${bundles.length} bundles OK`);
