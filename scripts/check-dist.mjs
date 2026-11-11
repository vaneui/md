// Fails the build if the client banner is missing or React context leaks into a server-safe bundle.
import fs from "node:fs";
import path from "node:path";

const dist = path.resolve(import.meta.dirname, "..", "dist");
const bundles = fs.readdirSync(dist).filter((f) => /\.(esm\.js|cjs)$/.test(f));
const problems = [];

for (const file of bundles) {
  const source = fs.readFileSync(path.join(dist, file), "utf8");
  const isClient = /^client\./.test(file);
  const hasBanner = source.startsWith('"use client";');
  if (isClient && !hasBanner) problems.push(`${file}: missing the "use client" banner`);
  if (!isClient && hasBanner) problems.push(`${file}: must not have the "use client" banner`);
  if (!isClient && /\b(createContext|useContext)\b/.test(source)) problems.push(`${file}: uses React context`);
}
if (!bundles.some((f) => /^client\./.test(f))) problems.push("no client bundle in dist");

if (problems.length) {
  console.error(`check-dist failed:\n${problems.map((p) => `  ${p}`).join("\n")}`);
  process.exit(1);
}
console.log(`check-dist: ${bundles.length} bundles OK`);
