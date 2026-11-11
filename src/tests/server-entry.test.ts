/** @jest-environment node */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { importGraph } from './importGraph';

// Guards that the main entry stays renderable from React Server Components.
const srcDir = path.resolve(__dirname, '..');
const CLIENT_ONLY = /\b(createContext|useContext|useState|useReducer|useEffect|useLayoutEffect|useRef|useMemo|useCallback|memo)\b/;
const stripComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const clientOnly = (file: string) => CLIENT_ONLY.test(stripComments(fs.readFileSync(file, 'utf8')));

describe('main entry (@vaneui/md) is server-safe', () => {
  const { files } = importGraph(path.join(srcDir, 'index.ts'));

  test('reaches <Md> and the renderers', () => {
    expect(files).toContain(path.join(srcDir, 'components', 'md.tsx'));
    expect(files).toContain(path.join(srcDir, 'components', 'code', 'MdFence.tsx'));
  });

  test('loads no module that creates or reads React context or uses hooks', () => {
    expect([...files].filter(clientOnly).map((f) => path.relative(srcDir, f))).toEqual([]);
  });

  test('the check sees the contexts and hooks in the client entry (sanity check)', () => {
    const client = importGraph(path.join(srcDir, 'client.tsx')).files;
    expect([...client].filter(clientOnly).map((f) => path.basename(f)).sort()).toEqual(['context.ts', 'md-client.tsx', 'stream.tsx']);
  });
});
