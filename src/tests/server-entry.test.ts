/** @jest-environment node */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { importGraph } from './importGraph';

// Guards that the main entry and the other server-importable subpaths stay usable from React Server Components.
const srcDir = path.resolve(__dirname, '..');
// React's react-server build has no context, no client hooks and no class components.
const CLIENT_ONLY = /\b(createContext|use[A-Z]\w*|memo)\b|\b(extends\s+|React\.)(React\.)?(Pure)?Component\b/;
const stripComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const clientOnly = (file: string) => CLIENT_ONLY.test(stripComments(fs.readFileSync(file, 'utf8')));
const relative = (files: Iterable<string>) => [...files].map((f) => path.relative(srcDir, f).replace(/\\/g, '/')).sort();

describe('server-safe entries', () => {
  test('the main entry reaches <Md> and the renderers', () => {
    const { files } = importGraph(path.join(srcDir, 'index.ts'));
    expect(relative(files)).toEqual(expect.arrayContaining(['components/md.tsx', 'components/code/MdFence.tsx']));
  });

  test('the main entry loads only Markdoc, @vaneui/ui (client components) and React', () => {
    const { packages } = importGraph(path.join(srcDir, 'index.ts'));
    expect([...packages].sort()).toEqual(['@markdoc/markdoc', '@vaneui/ui', 'react']);
  });

  test.each([['index.ts'], ['spec.ts'], ['registry.ts'], ['yaml.ts'], ['shiki.tsx']])(
    'src/%s loads no module that uses React context, hooks or class components',
    (entry) => {
      const { files } = importGraph(path.join(srcDir, entry));
      expect(relative([...files].filter(clientOnly))).toEqual([]);
    },
  );

  test('the check finds the contexts and hooks of the client entry (sanity check)', () => {
    const { files } = importGraph(path.join(srcDir, 'client.tsx'));
    expect(relative([...files].filter(clientOnly))).toEqual(['client.tsx', 'components/md-client.tsx', 'context.ts', 'stream.tsx']);
  });
});
