// Writes a `.d.mts` and a `.d.cts` next to every `.d.ts` in dist, so the types
// resolve under TypeScript's `node16` / `nodenext` module resolution as well as
// under `bundler`.
//
// The package is `"type": "module"`, so a plain `.d.ts` is read as an ES module
// declaration, where a relative import needs a file extension, and a consumer
// that `require`s the package needs CommonJS declarations. Each variant gets
// its relative specifiers rewritten to explicit paths: `./x.mjs` resolves only
// to `./x.d.mts`, and `./x.cjs` only to `./x.d.cts`, so the whole tree is
// written, not just the entries. The `.d.ts` files stay for the top-level
// `types` field.
import fs from "node:fs";
import path from "node:path";

const dist = path.resolve(import.meta.dirname, "..", "dist");

// Relative specifiers in `from "./x"` and `import("./x")`, bare "." and ".." included.
const SPECIFIER = /(\bfrom\s*|\bimport\s*\(\s*)(["'])(\.\.?(?:\/[^"']+)?)\2/g;

function rewriteSpecifiers(code, fileDir, extension) {
  return code.replace(SPECIFIER, (match, prefix, quote, specifier) => {
    if (/\.[cm]?js$/.test(specifier)) return match;
    const target = path.resolve(fileDir, specifier);
    if (fs.existsSync(`${target}.d.ts`)) return `${prefix}${quote}${specifier}${extension}${quote}`;
    if (fs.existsSync(path.join(target, "index.d.ts"))) return `${prefix}${quote}${specifier}/index${extension}${quote}`;
    // A real import always resolves (tsc compiled it), so this is import-like text in a comment.
    return match;
  });
}

const declarations = fs
  .readdirSync(dist, { recursive: true })
  .map((file) => path.join(dist, String(file)))
  .filter((file) => file.endsWith(".d.ts"));

if (declarations.length === 0) {
  console.error("generate-dual-types: no .d.ts files in dist; build the bundles first");
  process.exit(1);
}

for (const file of declarations) {
  const source = fs.readFileSync(file, "utf8");
  const dir = path.dirname(file);
  fs.writeFileSync(file.replace(/\.d\.ts$/, ".d.mts"), rewriteSpecifiers(source, dir, ".mjs"));
  fs.writeFileSync(file.replace(/\.d\.ts$/, ".d.cts"), rewriteSpecifiers(source, dir, ".cjs"));
}

console.log(`generate-dual-types: ${declarations.length} .d.mts and ${declarations.length} .d.cts files`);
