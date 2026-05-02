import { parseYamlFrontmatter } from '../yaml';

describe('parseYamlFrontmatter', () => {
  it('returns the parsed object for a normal YAML map', () => {
    const result = parseYamlFrontmatter('title: Hello\nauthor: Jane');
    expect(result).toEqual({ title: 'Hello', author: 'Jane' });
  });

  it('returns nested structures correctly', () => {
    const result = parseYamlFrontmatter('hero:\n  title: Welcome\n  count: 3');
    expect(result).toEqual({ hero: { title: 'Welcome', count: 3 } });
  });

  it('returns empty object for empty input', () => {
    expect(parseYamlFrontmatter('')).toEqual({});
  });

  it('returns empty object when YAML parses to null', () => {
    expect(parseYamlFrontmatter('---')).toEqual({});
  });

  it('returns empty object when YAML parses to a top-level string', () => {
    expect(parseYamlFrontmatter('"just a string"')).toEqual({});
  });

  it('returns empty object when YAML parses to a top-level array', () => {
    expect(parseYamlFrontmatter('- a\n- b\n- c')).toEqual({});
  });

  it('returns empty object when YAML parses to a top-level number', () => {
    expect(parseYamlFrontmatter('42')).toEqual({});
  });

  it('throws on syntactically invalid YAML (does not silently swallow errors)', () => {
    expect(() => parseYamlFrontmatter('{ not: valid: yaml: at all')).toThrow();
  });
});
