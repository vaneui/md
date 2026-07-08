import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderSpec, expandShorthand, collapseShorthand, sanitizeSpecProps, ComponentRegistry } from '../spec';

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
    const result = renderSpec({ component: 'Plain' }, registry, { depth: 17 });
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
    const skipped = renderSpec({ 'Plain': 'shorthand' }, registry, { depth: 1 });
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

describe('renderSpec — stable node identity (spec.id → React key)', () => {
  it('uses spec.id as the React key when present', () => {
    const el = renderSpec({ component: 'Plain', id: 42 }, registry) as React.ReactElement;
    expect(el.key).toBe('42');
  });

  it('still passes id through as a prop (components can read it)', () => {
    const el = renderSpec({ component: 'Plain', id: 7 }, registry) as React.ReactElement;
    expect((el.props as Record<string, unknown>).id).toBe(7);
  });

  it('falls back to the positional key when no id is present', () => {
    const el = renderSpec({ component: 'Plain' }, registry) as React.ReactElement;
    expect(el.key).toBeNull();
  });
});

describe('collapseShorthand — inverse of expandShorthand', () => {
  it('collapses a flagged leaf to a shorthand key + string value', () => {
    expect(collapseShorthand({ component: 'Title', xl: true, children: 'Welcome' })).toEqual({
      'Title xl': 'Welcome',
    });
  });

  it('collapses a content-less leaf to a null value', () => {
    expect(collapseShorthand({ component: 'Divider' })).toEqual({ Divider: null });
  });

  it('puts non-boolean props into the map form', () => {
    expect(
      collapseShorthand({ component: 'Button', primary: true, href: '/go', children: 'Go' }),
    ).toEqual({ 'Button primary': { href: '/go', children: 'Go' } });
  });

  it('puts id into the map form', () => {
    expect(collapseShorthand({ component: 'Card', id: 3, children: 'x' })).toEqual({
      Card: { id: 3, children: 'x' },
    });
  });

  it('recursively collapses array children', () => {
    const spec = {
      component: 'Stack',
      children: [
        { component: 'Title', xl: true, children: 'A' },
        { component: 'Text', children: 'B' },
      ],
    };
    expect(collapseShorthand(spec as any)).toEqual({
      Stack: [{ 'Title xl': 'A' }, { Text: 'B' }],
    });
  });

  it('round-trips through expandShorthand (collapse then expand ≡ original)', () => {
    const spec = {
      component: 'Card',
      primary: true,
      href: '/x',
      children: [
        { component: 'Title', xl: true, children: 'Welcome' },
        { component: 'Text', children: 'Done.' },
      ],
    };
    expect(expandShorthand(collapseShorthand(spec as any))).toEqual(spec);
  });
});

describe('sanitizeSpecProps — always-on fence prop hardening', () => {
  it('strips dangerouslySetInnerHTML, event handlers, and ref', () => {
    const out = sanitizeSpecProps({
      dangerouslySetInnerHTML: { __html: '<script>alert(1)</script>' },
      onClick: 'noop',
      onMouseEnter: 'noop',
      ref: 'x',
    });
    expect(out).toEqual({});
  });

  it('drops URL props carrying script-executing protocols', () => {
    expect(sanitizeSpecProps({ href: 'javascript:alert(1)' })).toEqual({});
    expect(sanitizeSpecProps({ src: 'vbscript:msgbox' })).toEqual({});
    expect(sanitizeSpecProps({ src: 'data:text/html,<script>' })).toEqual({});
  });

  it('is case-insensitive and tolerant of leading whitespace on protocols', () => {
    expect(sanitizeSpecProps({ href: '  JavaScript:alert(1)' })).toEqual({});
    expect(sanitizeSpecProps({ href: 'JAVASCRIPT:alert(1)' })).toEqual({});
  });

  it('keeps safe URLs, data:image, and all non-dangerous props', () => {
    expect(
      sanitizeSpecProps({
        href: '/get-started',
        src: 'data:image/png;base64,AAAA',
        primary: true,
        id: 3,
        className: 'x',
      }),
    ).toEqual({
      href: '/get-started',
      src: 'data:image/png;base64,AAAA',
      primary: true,
      id: 3,
      className: 'x',
    });
  });

  it('applies through renderSpec so dangerous props never reach the element', () => {
    const el = renderSpec(
      {
        component: 'Plain',
        dangerouslySetInnerHTML: { __html: '<img src=x onerror=alert(1)>' },
        href: 'javascript:alert(1)',
        primary: true,
      } as any,
      registry,
    ) as React.ReactElement;
    const props = el.props as Record<string, unknown>;
    expect(props.dangerouslySetInnerHTML).toBeUndefined();
    expect(props.href).toBeUndefined();
    expect(props.primary).toBe(true);
  });
});

describe('SanitizePolicy — configurable tightening over the floor', () => {
  it('allowedProtocols drops URL schemes not on the list, keeps relative URLs', () => {
    const policy = { allowedProtocols: ['https:'] };
    expect(sanitizeSpecProps({ href: 'https://ok.example' }, policy)).toEqual({ href: 'https://ok.example' });
    expect(sanitizeSpecProps({ href: 'http://no.example' }, policy)).toEqual({});
    expect(sanitizeSpecProps({ href: '/relative' }, policy)).toEqual({ href: '/relative' });
  });

  it('blockedProps strips extra prop names beyond the floor', () => {
    expect(sanitizeSpecProps({ foo: 1, bar: 2 }, { blockedProps: ['foo'] })).toEqual({ bar: 2 });
  });

  it('allowComponents narrows which components may render', () => {
    expect(renderSpec({ component: 'Plain' }, registry, { sanitize: { allowComponents: ['Other'] } })).toBeNull();
    const el = renderSpec({ component: 'Plain' }, registry, { sanitize: { allowComponents: ['Plain'] } });
    expect(React.isValidElement(el)).toBe(true);
  });

  it('a policy composes with the always-on floor (dangerous props still stripped)', () => {
    const out = sanitizeSpecProps(
      { href: 'javascript:alert(1)', onClick: 'x', keep: true },
      { allowedProtocols: ['https:'] },
    );
    expect(out).toEqual({ keep: true });
  });
});
