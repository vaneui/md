import React from 'react';
import { render } from '@testing-library/react';
import { Md } from '../components/md';
import { defaultRegistry } from '../registry';
import { parseYamlFrontmatter } from '../yaml';
import { renderSpec, type ComponentRegistry } from '../spec';
import { fence, INHERITED_KEYS } from './fencePayloads';

// Names a document chooses must never be looked up through the prototype
// chain: `constructor`, `toString` and the like exist on every plain object.

const keys = INHERITED_KEYS.map((key) => [key]);

describe('registry lookups by a name from a vaneui fence', () => {
  const Plain = (props: Record<string, unknown>) => <div {...props} />;

  test.each(keys)('component: %s renders nothing', (key) => {
    expect(renderSpec({ component: key }, { Plain })).toBeNull();
    expect(renderSpec({ component: key }, defaultRegistry)).toBeNull();
    expect(renderSpec({ component: key }, {})).toBeNull();
  });

  test.each(keys)('a fence with component: %s renders nothing and the rest of the document', (key) => {
    const content = `Before.\n\n${fence(`component: ${key}\ntext: hidden`)}\n\nAfter.`;
    const { container } = render(<Md content={content} parseFrontmatter={parseYamlFrontmatter} components={defaultRegistry} />);
    expect(container.textContent).toBe('Before.After.');
  });

  test.each(keys)('%s nested as a child renders nothing, its siblings render', (key) => {
    const { container } = render(
      <Md
        content={fence(`Card:\n  - component: ${key}\n    text: hidden\n  - Text: shown`)}
        parseFrontmatter={parseYamlFrontmatter}
        components={defaultRegistry}
      />,
    );
    expect(container.textContent).toBe('shown');
  });

  test('a component registered under such a name as an own key still renders', () => {
    const registry = Object.create(null) as ComponentRegistry;
    registry.constructor = Plain;
    expect(React.isValidElement(renderSpec({ component: 'constructor', text: 'own' }, registry))).toBe(true);
    const own: ComponentRegistry = { Plain };
    Object.defineProperty(own, 'toString', { value: Plain, enumerable: true });
    expect(React.isValidElement(renderSpec({ component: 'toString' }, own))).toBe(true);
  });

  test('a registry entry that is not a component renders nothing', () => {
    const registry = { Zero: 0, Nothing: null, Flag: true, Missing: undefined, Empty: '' } as unknown as ComponentRegistry;
    for (const name of Object.keys(registry)) expect(renderSpec({ component: name }, registry)).toBeNull();
  });

  test('entries a registry only inherits are not components of that registry', () => {
    const registry = Object.create({ Plain }) as ComponentRegistry;
    expect(renderSpec({ component: 'Plain' }, registry)).toBeNull();
  });
});

describe('Markdoc lookups by a name from the document', () => {
  const text = (content: string, props: Partial<React.ComponentProps<typeof Md>> = {}) =>
    render(<Md content={content} {...props} />).container.textContent ?? '';

  test.each(keys)('a tag, a function and a partial named %s do not throw', (key) => {
    const open = `{% ${key} %}`;
    const close = `{% /${key} %}`;
    const call = `{% ${key}() %}`;
    const partial = `{% partial file="${key}" /%}`;
    const out = text([`${open}tag body${close}`, `call ${call} done`, partial, 'After.'].join('\n\n'));
    expect(out).toContain('tag body');
    expect(out).toContain('call ');
    expect(out).toContain(`Partial "${key}" not found`);
    expect(out).toContain('After.');
  });

  test.each(keys)('the variable named %s does not throw', (key) => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const variables = ['$' + key, '$markdoc.' + key, '$markdoc.frontmatter.' + key].map((name) => `{% ${name} %}`);
      const out = text(`value ${variables.join(' and ')}.\n\nAfter.`, { frontmatter: { title: 'T' } });
      expect(out).toContain('value ');
      expect(out).toContain('After.');
    } finally {
      errorSpy.mockRestore();
    }
  });

  test('a variable that holds an object renders nothing instead of throwing', () => {
    const content = 'Object: {% $markdoc %}{% $markdoc.frontmatter %}{% $data %}. List: {% $list %}. Title: {% $markdoc.frontmatter.title %}.';
    const out = text(content, {
      frontmatter: { title: 'T' },
      config: { variables: { data: { a: 1 }, list: ['x', { y: 1 }, 'z'] } },
    });
    expect(out).toBe('Object: . List: xz. Title: T.');
  });
});
