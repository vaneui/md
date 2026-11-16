/** @jest-environment node */
import React from 'react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { Md } from '../components/md';
import { defaultRegistry } from '../registry';
import { parseYamlFrontmatter } from '../yaml';
import { untrustedPreset } from '../preset';
import { fence, FORBIDDEN_ELEMENTS, INHERITED_KEYS, PAYLOADS } from './fencePayloads';

// What a fence may produce in server-rendered HTML, where a <script> or an
// <iframe srcdoc> in the markup runs as soon as the browser parses it.

const LEVELS = [
  ['floor (no policy)', undefined],
  ['untrusted level (untrustedPreset)', [untrustedPreset]],
] as const;

const FORBIDDEN_MARKUP = new RegExp(`<(?:${FORBIDDEN_ELEMENTS.join('|')})[\\s/>]|\\s(?:srcdoc|http-equiv|httpequiv|on[a-z]+)=`, 'i');

describe.each(LEVELS)('vaneui fence payloads, server-rendered HTML, %s', (_level, presets) => {
  const html = (yaml: string, renderer: (el: React.ReactElement) => string = renderToStaticMarkup) =>
    renderer(<Md content={fence(yaml)} parseFrontmatter={parseYamlFrontmatter} components={defaultRegistry} presets={presets as any} />);

  let errorSpy: jest.SpyInstance;
  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => errorSpy.mockRestore());

  test.each(PAYLOADS.map((p) => [p.name, p]))('%s renders no forbidden element or attribute', (_name, { yaml, warns }) => {
    expect(html(yaml)).not.toMatch(FORBIDDEN_MARKUP);
    expect(html(yaml, renderToString)).not.toMatch(FORBIDDEN_MARKUP);
    if (!warns) expect(errorSpy).not.toHaveBeenCalled();
  });

  test('the script payload renders its text as escaped paragraph content', () => {
    const out = html('Text:\n  tag: script\n  children: "alert(document.domain)</script><script>alert(2)"');
    expect(out).toMatch(/<p [^>]*>alert\(document\.domain\)&lt;\/script&gt;&lt;script&gt;alert\(2\)<\/p>/);
  });

  test.each(INHERITED_KEYS.map((key) => [key]))('tag: %s falls back to the default element', (key) => {
    expect(html(`Text:\n  tag: ${key}\n  children: still here`)).toMatch(/<p [^>]*>still here<\/p>/);
  });
});

describe('vaneui fence, server-rendered HTML, trusted documents', () => {
  test('className, id, style and a safe tag render as before', () => {
    const out = renderToStaticMarkup(
      <Md
        content={fence('Card:\n  tag: article\n  id: intro\n  className: mine\n  style:\n    maxWidth: 320px\n  children: Body')}
        parseFrontmatter={parseYamlFrontmatter}
        components={defaultRegistry}
      />,
    );
    const article = /<article [^>]*>Body<\/article>/.exec(out)?.[0];
    expect(article).toMatch(/ id="intro"/);
    expect(article).toMatch(/class="[^"]*\bmine\b[^"]*"/);
    expect(article).toMatch(/style="max-width:320px"/);
  });
});

describe.each(LEVELS)('URL props in a vaneui fence, server-rendered HTML, %s', (_level, presets) => {
  const URLS = ['"java\\tscript:alert(1)"', '"\\x01javascript:alert(1)"', '"java\\nscript:alert(1)"', '"  JAVASCRIPT:alert(1)"', '"vb\\tscript:x"', '"d\\tata:text/html,x"'];

  test.each(URLS.map((url) => [url]))('href: %s never reaches the markup', (url) => {
    const out = renderToStaticMarkup(
      <Md
        content={fence(`Col:\n  - Button:\n      href: ${url}\n      text: go\n  - Link:\n      href: ${url}\n      text: go\n  - Img:\n      src: ${url}\n      alt: x`)}
        parseFrontmatter={parseYamlFrontmatter}
        components={defaultRegistry}
        presets={presets as any}
      />,
    );
    expect(out).not.toMatch(/\s(?:href|src)=/i);
    expect(out).not.toMatch(/script:|data:/i);
  });
});
