import React from 'react';
import { render } from '@testing-library/react';
import { Md } from '../components/md';
import { Md as ClientMd } from '../components/md-client';
import { defaultRegistry } from '../registry';
import { parseYamlFrontmatter } from '../yaml';
import { untrustedPreset } from '../preset';
import { strictSanitizePolicy } from '../sanitize';
import { renderSpec, sanitizeSpecProps, type ComponentRegistry } from '../spec';
import { fence, FORBIDDEN_ATTRIBUTES, FORBIDDEN_ELEMENTS, INHERITED_KEYS, PAYLOADS } from './fencePayloads';

// What a fence may produce in a client render, at both levels: the always-on
// floor (no policy) and the untrusted level (untrustedPreset).

const LEVELS = [
  ['floor (no policy)', undefined],
  ['untrusted level (untrustedPreset)', [untrustedPreset]],
] as const;

const forbiddenAttributes = (root: Element): string[] =>
  [...root.querySelectorAll('*')].flatMap((el) =>
    [...el.attributes].map((attr) => attr.name.toLowerCase()).filter((name) => FORBIDDEN_ATTRIBUTES.test(name)),
  );

describe.each(LEVELS)('vaneui fence payloads, client render, %s', (_level, presets) => {
  const renderFence = (yaml: string, registry: ComponentRegistry = defaultRegistry) =>
    render(<Md content={fence(yaml)} parseFrontmatter={parseYamlFrontmatter} components={registry} presets={presets as any} />);

  let errorSpy: jest.SpyInstance;
  beforeEach(() => {
    // Dropped props never reach React, so it has nothing to warn about.
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => errorSpy.mockRestore());

  test.each(PAYLOADS.map((p) => [p.name, p]))('%s renders no forbidden element or attribute', (_name, { yaml, warns }) => {
    const { container } = renderFence(yaml);
    expect(container.querySelector(FORBIDDEN_ELEMENTS.join(','))).toBeNull();
    expect(forbiddenAttributes(container)).toEqual([]);
    if (!warns) expect(errorSpy).not.toHaveBeenCalled();
  });

  test('the same payloads are inert in the client <Md>', () => {
    for (const { yaml } of PAYLOADS) {
      const { container, unmount } = render(
        <ClientMd content={fence(yaml)} parseFrontmatter={parseYamlFrontmatter} components={defaultRegistry} presets={presets as any} />,
      );
      expect(container.querySelector(FORBIDDEN_ELEMENTS.join(','))).toBeNull();
      expect(forbiddenAttributes(container)).toEqual([]);
      unmount();
    }
  });

  test.each(INHERITED_KEYS.map((key) => [key]))('tag: %s falls back to the default element', (key) => {
    const { container } = renderFence(`Text:\n  tag: ${key}\n  children: still here`);
    const el = container.querySelector('.vane-text');
    expect(el?.tagName).toBe('P');
    expect(el?.textContent).toBe('still here');
  });

  test('a tag that is not a string is dropped', () => {
    const { container } = renderFence('Text:\n  tag:\n    toString: script\n  children: still here');
    expect(container.querySelector('.vane-text')?.tagName).toBe('P');
    const list = renderFence('Text:\n  tag: [script]\n  children: still here');
    expect(list.container.querySelector('.vane-text')?.tagName).toBe('P');
  });

  test('a custom registry component never receives the dropped props', () => {
    const seen: Record<string, unknown>[] = [];
    const Probe = (props: Record<string, unknown>) => {
      seen.push(props);
      return <span data-testid="probe" />;
    };
    renderFence(
      [
        'Probe:',
        '  tag: script',
        '  srcDoc: "<script>alert(1)</script>"',
        '  srcdoc: "<script>alert(1)</script>"',
        '  onClick: "alert(1)"',
        '  onclick: "alert(1)"',
        '  httpEquiv: refresh',
        '  ref: x',
        '  dangerouslySetInnerHTML:',
        '    __html: "<b>x</b>"',
      ].join('\n'),
      { Probe },
    );
    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual({ children: null });
  });
});

describe('vaneui fence at the floor: trusted documents render as before', () => {
  const renderFence = (yaml: string, registry: ComponentRegistry = defaultRegistry) =>
    render(<Md content={fence(yaml)} parseFrontmatter={parseYamlFrontmatter} components={registry} />);

  test('className, id, style and a safe tag reach a default registry component', () => {
    const { container } = renderFence(
      'Card:\n  tag: article\n  id: intro\n  className: mine\n  style:\n    maxWidth: 320px\n  children: Body',
    );
    const el = container.querySelector('article#intro') as HTMLElement;
    expect(el).not.toBeNull();
    expect(el).toHaveClass('vane-card', 'mine');
    expect(el.style.maxWidth).toBe('320px');
    expect(el.textContent).toBe('Body');
  });

  test.each([['span'], ['h2'], ['nav'], ['section'], ['aside'], ['blockquote'], ['a']])('tag: %s is honoured', (tag) => {
    const { container } = renderFence(`Text:\n  tag: ${tag}\n  children: x`);
    expect(container.querySelector('.vane-text')?.tagName).toBe(tag.toUpperCase());
  });

  test('a safe tag in upper case is honoured as its lower-case element', () => {
    const { container } = renderFence('Text:\n  tag: SPAN\n  children: x');
    expect(container.querySelector('.vane-text')?.tagName).toBe('SPAN');
  });

  test('a custom registry component receives its own props unchanged', () => {
    const seen: Record<string, unknown>[] = [];
    const Widget = (props: Record<string, unknown>) => {
      seen.push(props);
      return <div data-testid="widget" />;
    };
    renderFence(
      [
        'Widget:',
        '  id: w1',
        '  className: mine',
        '  tag: section',
        '  mode: compact',
        '  items: [1, 2]',
        '  options:',
        '    dense: true',
        '  data-track: hero',
        '  style:',
        '    color: red',
        '  children: Body',
      ].join('\n'),
      { Widget },
    );
    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual({
      id: 'w1',
      className: 'mine',
      tag: 'section',
      mode: 'compact',
      items: [1, 2],
      options: { dense: true },
      'data-track': 'hero',
      style: { color: 'red' },
      children: 'Body',
    });
  });
});

describe('vaneui fence at the untrusted level: only known props pass', () => {
  const renderFence = (yaml: string, registry: ComponentRegistry = defaultRegistry) =>
    render(<Md content={fence(yaml)} parseFrontmatter={parseYamlFrontmatter} components={registry} presets={[untrustedPreset]} />);

  test('tag, style, className, id and unknown props are dropped; boolean props and listed attributes pass', () => {
    const { container } = renderFence(
      [
        'Card primary filled:',
        '  tag: article',
        '  id: intro',
        '  className: fixed inset-0',
        '  style:',
        '    position: fixed',
        '    inset: 0',
        '  data-method: delete',
        '  name: clobber',
        '  title: A card',
        '  aria-label: Intro card',
        '  children: Body',
      ].join('\n'),
    );
    const el = container.querySelector('.vane-card') as HTMLElement;
    expect(el.tagName).toBe('DIV');
    expect(el).not.toHaveAttribute('id');
    expect(el).not.toHaveAttribute('style');
    expect(el).not.toHaveAttribute('data-method');
    expect(el).not.toHaveAttribute('name');
    expect(el.className).not.toMatch(/\bfixed\b|inset-0/);
    expect(el).toHaveAttribute('data-appearance', 'primary');
    expect(el).toHaveAttribute('data-variant', 'filled');
    expect(el).toHaveAttribute('title', 'A card');
    expect(el).toHaveAttribute('aria-label', 'Intro card');
    expect(el.textContent).toBe('Body');
  });

  test('href, src, alt, value and max pass to the default registry components', () => {
    const { container } = renderFence(
      [
        'Col:',
        '  - Link:',
        '      href: https://example.com/docs',
        '      target: _blank',
        '      text: Docs',
        '  - Img:',
        '      src: https://example.com/a.png',
        '      alt: A picture',
        '      width: 40',
        '      height: 30',
        '  - Progress:',
        '      value: 30',
        '      max: 60',
        '      aria-label: Upload',
      ].join('\n'),
    );
    const link = container.querySelector('a') as HTMLAnchorElement;
    expect(link).toHaveAttribute('href', 'https://example.com/docs');
    expect(link).toHaveAttribute('target', '_blank');
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img).toHaveAttribute('src', 'https://example.com/a.png');
    expect(img).toHaveAttribute('alt', 'A picture');
    expect(img).toHaveAttribute('width', '40');
    const bar = container.querySelector('[role="progressbar"]') as HTMLElement;
    expect(bar).toHaveAttribute('aria-valuenow', '30');
    expect(bar).toHaveAttribute('aria-valuemax', '60');
    expect(bar).toHaveAttribute('aria-label', 'Upload');
  });

  test('a custom registry component receives only the known props', () => {
    const seen: Record<string, unknown>[] = [];
    const Widget = (props: Record<string, unknown>) => {
      seen.push(props);
      return <div data-testid="widget" />;
    };
    renderFence(
      'Widget primary:\n  id: w1\n  className: mine\n  tag: section\n  mode: compact\n  items: [1, 2]\n  href: /ok\n  children: Body',
      { Widget },
    );
    expect(seen[0]).toEqual({ primary: true, href: '/ok', children: 'Body' });
  });

  test('a listed attribute with an object or array value is dropped', () => {
    expect(sanitizeSpecProps({ title: { toString: 1 }, alt: ['a'], 'aria-label': { a: 1 }, value: 3 }, strictSanitizePolicy)).toEqual({
      value: 3,
    });
  });

  test('the spec id still keys the element, but is not passed as a prop', () => {
    const Plain = (props: Record<string, unknown>) => <div {...props} />;
    const el = renderSpec({ component: 'Plain', id: 7 }, { Plain }, { sanitize: strictSanitizePolicy }) as React.ReactElement;
    expect(el.key).toBe('7');
    expect(el.props).toEqual({ children: null });
  });
});

describe.each(LEVELS)('URL props in a vaneui fence, %s', (_level, presets) => {
  const URLS = ['"java\\tscript:alert(1)"', '"\\x01javascript:alert(1)"', '"java\\nscript:alert(1)"', '"  JAVASCRIPT:alert(1)"', '"vb\\tscript:x"', '"d\\tata:text/html,x"'];

  test.each(URLS.map((url) => [url]))('href: %s never reaches the link', (url) => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <Md
        content={fence(`Col:\n  - Button:\n      href: ${url}\n      text: go\n  - Link:\n      href: ${url}\n      text: go\n  - Img:\n      src: ${url}\n      alt: x`)}
        parseFrontmatter={parseYamlFrontmatter}
        components={defaultRegistry}
        presets={presets as any}
      />,
    );
    for (const el of container.querySelectorAll('*')) {
      expect(el).not.toHaveAttribute('href');
      expect(el).not.toHaveAttribute('src');
    }
    // Without its href the Button stays a <button>.
    expect(container.querySelector('button')?.textContent).toBe('go');
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
