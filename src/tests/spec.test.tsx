import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderSpec, ComponentRegistry } from '../spec';

const Plain: React.FC<React.PropsWithChildren<{ 'data-testid'?: string }>> = ({
  children,
  ...rest
}) => <div {...rest}>{children}</div>;

const registry: ComponentRegistry = { Plain };

describe('renderSpec — direct unit tests', () => {
  it('returns null for null spec', () => {
    expect(renderSpec(null, registry)).toBeNull();
  });

  it('returns null for undefined spec', () => {
    expect(renderSpec(undefined, registry)).toBeNull();
  });

  it('returns the string as-is when spec is a string', () => {
    expect(renderSpec('hello', registry)).toBe('hello');
  });

  it('returns null when spec is missing the component field', () => {
    expect(renderSpec({ text: 'no component' } as any, registry)).toBeNull();
  });

  it('returns null when component name is not in the registry', () => {
    expect(renderSpec({ component: 'NotInRegistry' }, registry)).toBeNull();
  });

  it('returns null when component field is not a string', () => {
    expect(renderSpec({ component: 123 } as any, registry)).toBeNull();
  });

  it('returns null for top-level array spec (children must be wrapped)', () => {
    expect(renderSpec([{ component: 'Plain' }] as any, registry)).toBeNull();
  });

  it('returns a valid React element for a registered component', () => {
    const result = renderSpec({ component: 'Plain', text: 'hi' }, registry);
    expect(React.isValidElement(result)).toBe(true);
  });

  it('caps recursion at MAX_DEPTH (17 returns null)', () => {
    // depth parameter is internal; pass it explicitly to verify the cap
    const result = renderSpec({ component: 'Plain' }, registry, undefined, 17);
    expect(result).toBeNull();
  });

  it('renders a real component tree end-to-end via testing-library', () => {
    const { container } = render(
      <>{renderSpec({ component: 'Plain', text: 'leaf' }, registry)}</>
    );
    expect(container.textContent).toBe('leaf');
  });

  it('expandShorthand runs only at depth 0 — passing depth>0 skips it', () => {
    // At depth 0, shorthand expands and renders.
    const expanded = renderSpec({ 'Plain': 'shorthand' }, registry);
    expect(React.isValidElement(expanded)).toBe(true);

    // At depth>0, shorthand is NOT expanded — the spec lacks `component`, returns null.
    const skipped = renderSpec({ 'Plain': 'shorthand' }, registry, undefined, 1);
    expect(skipped).toBeNull();
  });

  it('children resolution: array > string > text > none', () => {
    const reg: ComponentRegistry = {
      Plain: ({ children }: any) => <span data-testid="leaf">{children}</span>,
    };

    // Children array wins
    const a = render(
      <>{renderSpec(
        { component: 'Plain', children: [{ component: 'Plain', text: 'x' }], text: 'ignored' } as any,
        reg
      )}</>
    );
    expect(a.container.textContent).toBe('x');
    a.unmount();

    // Children string wins over text
    const b = render(
      <>{renderSpec({ component: 'Plain', children: 'from-children', text: 'ignored' } as any, reg)}</>
    );
    expect(b.container.textContent).toBe('from-children');
    b.unmount();

    // Falls back to text when no children
    const c = render(
      <>{renderSpec({ component: 'Plain', text: 'from-text' }, reg)}</>
    );
    expect(c.container.textContent).toBe('from-text');
  });
});
