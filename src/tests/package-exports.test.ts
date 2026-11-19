/** @jest-environment node */
import fs from 'node:fs';
import path from 'node:path';

const exportsMap: Record<string, unknown> = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'),
).exports;

describe('package exports map', () => {
  // TypeScript 6 reports `import "@vaneui/md/styles"` as an error when the import resolves to no
  // declaration, so the stylesheet entry carries a `types` target for both module systems. The
  // top-level `default` is the target Tailwind reads: its resolver looks up
  // `@import "@vaneui/md/styles"` under the `style` condition alone, and without a `default` the
  // import fails ("./styles" is not exported under the condition "style").
  it('gives the stylesheet entry a declaration and a default target', () => {
    const css = './dist/styles/index.css';
    expect(exportsMap['./styles']).toEqual({
      import: { types: './dist/styles/index.d.mts', default: css },
      require: { types: './dist/styles/index.d.cts', default: css },
      default: css,
    });
  });

  it('has no other stylesheet entry', () => {
    const cssEntries = Object.keys(exportsMap).filter((subpath) => JSON.stringify(exportsMap[subpath]).includes('.css"'));
    expect(cssEntries).toEqual(['./styles']);
  });
});
