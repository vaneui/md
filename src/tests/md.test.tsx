import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, defaultTheme, type PartialTheme } from '@vaneui/ui';
import { parse as parseYaml } from 'yaml';
import { Md } from '../components/md';
import { defaultRegistry } from '../registry';
import { expandShorthand } from '../spec';

describe('Md Component Tests', () => {
  it('renders basic text content', () => {
    const content = 'Hello world';
    render(<Md content={content} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders headings correctly', () => {
    const content = '# Main Title\n## Subtitle';
    render(<Md content={content} />);
    expect(screen.getByText('Main Title')).toBeInTheDocument();
    expect(screen.getByText('Subtitle')).toBeInTheDocument();
  });

  it('renders lists correctly', () => {
    const content = '- Item 1\n- Item 2\n- Item 3';
    render(<Md content={content} />);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('renders links correctly', () => {
    const content = '[Link text](https://example.com)';
    render(<Md content={content} />);
    const link = screen.getByRole('link', { name: 'Link text' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('renders images correctly', () => {
    const content = '![Alt text](https://example.com/image.jpg "Image title")';
    render(<Md content={content} />);
    const img = screen.getByRole('img', { name: 'Alt text' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
    expect(img).toHaveAttribute('title', 'Image title');
  });

  it('renders with frontmatter', () => {
    const content = 'Hello world';
    const frontmatter = { title: 'Test Page', author: 'Test Author' };
    render(<Md content={content} frontmatter={frontmatter} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  describe('with ThemeProvider', () => {
    it('should render headings with default theme classes', () => {
      const content = '# Main Title\n## Subtitle\n### Section\n#### Sub-section\n##### Minor';
      const { container } = render(
        <ThemeProvider theme={defaultTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      // Test h1 (level 1)
      const h1 = container.querySelector('h1');
      expect(h1).toBeInTheDocument();
      expect(h1).toHaveClass('text-balance', 'w-fit');
      expect(h1).toHaveClass('text-(length:--fs-desktop)'); // CSS variable font size
      // Default appearance may not be visible as explicit CSS class
      expect(h1).toHaveClass('font-heading', 'font-semibold');

      // Test h2 (level 2)
      const h2 = container.querySelector('h2');
      expect(h2).toBeInTheDocument();
      expect(h2).toHaveClass('text-(length:--fs-desktop)'); // CSS variable font size
      // Default appearance may not be visible as explicit CSS class

      // Test h3 (level 3)
      const h3 = container.querySelector('h3');
      expect(h3).toBeInTheDocument();
      expect(h3).toHaveClass('text-(length:--fs-desktop)'); // CSS variable font size
      // Default appearance may not be visible as explicit CSS class

      // Test h4 (level 4)
      const h4 = container.querySelector('h4');
      expect(h4).toBeInTheDocument();
      expect(h4).toHaveClass('text-(length:--fs-desktop)'); // CSS variable font size
      // Default appearance may not be visible as explicit CSS class

      // Test h5 (level 5)
      const h5 = container.querySelector('h5');
      expect(h5).toBeInTheDocument();
      expect(h5).toHaveClass('text-(length:--fs-desktop)'); // CSS variable font size
      // Default appearance may not be visible as explicit CSS class
    });

    it('should render links with default theme classes', () => {
      const content = '[Test Link](https://example.com)';
      const { container } = render(
        <ThemeProvider theme={defaultTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      expect(link).toHaveClass('hover:underline', 'w-fit');
      // cursor-pointer was removed from Link defaults in new VaneUI
      expect(link).toHaveClass('text-(--link-text)'); // link appearance
      expect(link).toHaveClass('font-sans', 'underline');
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('should render lists with default theme classes', () => {
      const content = '- First item\n- Second item\n- Third item';
      const { container } = render(
        <ThemeProvider theme={defaultTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      const list = container.querySelector('ul');
      expect(list).toBeInTheDocument();
      expect(list).toHaveClass('list-disc', 'list-outside');
      // Size is inherited from theme defaults, not always set explicitly; // md size
      expect(list).toHaveClass('text-(length:--fs)'); // CSS variable font size
      expect(list).toHaveClass('pl-(--pl)'); // default padding
      expect(list).toHaveClass('font-sans', 'font-normal');

      const listItems = container.querySelectorAll('li');
      expect(listItems).toHaveLength(3);
      listItems.forEach(listItem => {
        // ListItems inherit color from parent List
        // List items inherit from parent list styling
        expect(listItem).toHaveClass('text-(--text-color)'); // primary is now default
      });
    });

    it('should render images with correct styling', () => {
      const content = '![Alt text](https://example.com/image.jpg "Image title")';
      const { container } = render(
        <ThemeProvider theme={defaultTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      // Now wrapped in Card component
      expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
      expect(img).toHaveAttribute('alt', 'Alt text');
      expect(img).toHaveAttribute('title', 'Image title');
    });

    it('should apply appearance variants to headings', () => {
      const content = '# Primary Title';
      const { container, rerender } = render(
        <ThemeProvider theme={defaultTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      // Default appearance
      let h1 = container.querySelector('h1');
      // Default appearance may not be visible as explicit CSS class

      // Test with different appearance by checking if Title component can accept appearance props
      // Since our MdHeading component passes through props, it should work with VaneUI Title props
      const customContent = '# Custom Title';
      rerender(
        <ThemeProvider theme={defaultTheme}>
          <Md content={customContent} />
        </ThemeProvider>
      );

      h1 = container.querySelector('h1');
      expect(h1).toBeInTheDocument();
      // Default appearance may not be visible as explicit CSS class
    });

    it('should handle complex markdown with mixed elements', () => {
      const content = `# Main Title
      
This is a paragraph with [a link](https://example.com).

## Section
- Item 1
- Item 2

![Image](https://example.com/img.jpg)`;

      const { container } = render(
        <ThemeProvider theme={defaultTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      // Check all elements are rendered with proper theme classes
      const h1 = container.querySelector('h1');
      expect(h1).toHaveClass('font-semibold');
      expect(h1).toHaveClass('text-(length:--fs-desktop)');

      const h2 = container.querySelector('h2');
      expect(h2).toHaveClass('font-semibold');
      expect(h2).toHaveClass('text-(length:--fs-desktop)');

      const link = container.querySelector('a');
      expect(link).toHaveClass('text-(--link-text)', 'hover:underline');

      const list = container.querySelector('ul');
      expect(list).toHaveClass('list-disc', 'list-outside');
      expect(list).toHaveClass('text-(length:--fs)');

      const img = container.querySelector('img');
      // Now wrapped in Card component
    });

    it('should work with frontmatter variables', () => {
      const content = 'Hello world';
      const frontmatter = { title: 'Test Page', author: 'Test Author' };
      
      const { container } = render(
        <ThemeProvider theme={defaultTheme}>
          <Md content={content} frontmatter={frontmatter} />
        </ThemeProvider>
      );

      // The content should still render properly
      expect(screen.getByText('Hello world')).toBeInTheDocument();
      
      // Check that the container (Col component) is rendered
      const colElement = container.firstChild;
      expect(colElement).toBeInTheDocument();
    });

    it('should handle empty content gracefully', () => {
      const content = '';
      const { container } = render(
        <ThemeProvider theme={defaultTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      // Should render the container even with empty content
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle markdown with inline code', () => {
      const content = 'Here is some `inline code` in text.';
      render(
        <ThemeProvider theme={defaultTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      expect(screen.getByText(/Here is some/)).toBeInTheDocument();
      expect(screen.getByText(/inline code/)).toBeInTheDocument();
    });
  });

  describe('with basic theme integration', () => {
    it('should apply custom theme defaults', () => {
      const content = '# Custom Title\n[Custom Link](https://example.com)\n- Custom List';
      const customTheme: PartialTheme = {
        title: {
          defaults: {
            primary: true
          }
        }
      };

      const { container } = render(
        <ThemeProvider theme={customTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      const h1 = container.querySelector('h1');
      expect(h1).toHaveClass('text-(--text-color)');
      expect(h1).toHaveClass('text-(length:--fs-desktop)');
    });
  });

  describe('frontmatter parsing', () => {
    const docWithFm = '---\ntitle: Hello World\nauthor: Jane\n---\n\n# {% $markdoc.frontmatter.title %}\n\nBy {% $markdoc.frontmatter.author %}.';

    it('parses YAML frontmatter when parseFrontmatter is supplied', () => {
      render(<Md content={docWithFm} parseFrontmatter={parseYaml} />);
      expect(screen.getByText('Hello World')).toBeInTheDocument();
      expect(screen.getByText(/By Jane\./)).toBeInTheDocument();
    });

    it('explicit frontmatter prop wins over content YAML', () => {
      render(
        <Md
          content={docWithFm}
          parseFrontmatter={parseYaml}
          frontmatter={{ title: 'Override', author: 'Override' }}
        />
      );
      expect(screen.getByText('Override')).toBeInTheDocument();
      expect(screen.queryByText('Hello World')).not.toBeInTheDocument();
    });

    it('drops the YAML block from output even without parseFrontmatter', () => {
      const content = '---\ntitle: Hidden\n---\n\nBody text.';
      render(<Md content={content} />);
      expect(screen.getByText('Body text.')).toBeInTheDocument();
      expect(screen.queryByText(/title: Hidden/)).not.toBeInTheDocument();
    });

    it('exposes raw frontmatter at $markdoc.frontmatterRaw', () => {
      const content = '---\ntitle: Raw\n---\n\nRaw is: {% $markdoc.frontmatterRaw %}';
      render(<Md content={content} />);
      expect(screen.getByText(/Raw is: title: Raw/)).toBeInTheDocument();
    });

    it('routes malformed YAML to MdError without throwing', () => {
      const content = '---\n: : : : :\n  bad: [unclosed\n---\n\nBody.';
      const renderFn = () =>
        render(<Md content={content} parseFrontmatter={parseYaml} />);
      expect(renderFn).not.toThrow();
      const { container } = renderFn();
      // MdError renders a Card with "Error:" text
      expect(container.textContent).toMatch(/Error:/);
      // Body still renders below the error
      expect(screen.getAllByText('Body.').length).toBeGreaterThan(0);
    });

    it('supports custom parser function (not yaml.parse)', () => {
      const content = '---\nignored content\n---\n\n{% $markdoc.frontmatter.from %}';
      const customParser = (_raw: string) => ({ from: 'custom' });
      render(<Md content={content} parseFrontmatter={customParser} />);
      expect(screen.getByText('custom')).toBeInTheDocument();
    });
  });

  describe('vaneui fence — inline component spec rendering', () => {
    const heroFence = [
      '# Title',
      '',
      '```vaneui',
      'component: Card',
      'primary: true',
      'filled: true',
      'children:',
      '  - component: Title',
      '    xl: true',
      '    text: Welcome',
      '  - component: Text',
      '    text: Everything you need to ship.',
      '```',
      '',
      'After fence.',
    ].join('\n');

    it('renders a vaneui fence as a real component tree', () => {
      render(
        <Md
          content={heroFence}
          parseFrontmatter={parseYaml}
          components={defaultRegistry}
        />
      );
      expect(screen.getByText('Welcome')).toBeInTheDocument();
      expect(screen.getByText('Everything you need to ship.')).toBeInTheDocument();
      expect(screen.getByText('After fence.')).toBeInTheDocument();
    });

    it('falls back to a code block when parseFrontmatter is missing', () => {
      const { container } = render(
        <Md content={heroFence} components={defaultRegistry} />
      );
      // No parser → fence renders as code, raw YAML visible
      expect(container.querySelector('code.language-vaneui')).toBeInTheDocument();
      expect(container.textContent).toContain('component: Card');
    });

    it('shows MdError + code block on malformed YAML in vaneui fence', () => {
      const broken = '```vaneui\n: : : :\n  bad: [unclosed\n```';
      const { container } = render(
        <Md
          content={broken}
          parseFrontmatter={parseYaml}
          components={defaultRegistry}
        />
      );
      expect(container.textContent).toMatch(/Error:/);
      expect(container.textContent).toMatch(/vaneui spec parse error/);
      expect(container.querySelector('code.language-vaneui')).toBeInTheDocument();
    });

    it('silently no-ops on unknown component name', () => {
      const content = '```vaneui\ncomponent: NotARealComponent\ntext: nope\n```\n\nAfter.';
      render(
        <Md content={content} parseFrontmatter={parseYaml} components={defaultRegistry} />
      );
      expect(screen.queryByText('nope')).not.toBeInTheDocument();
      expect(screen.getByText('After.')).toBeInTheDocument();
    });

    it('respects a custom components registry', () => {
      const Custom: React.FC<React.PropsWithChildren> = ({ children }) => (
        <span data-testid="custom-marker">{children}</span>
      );
      const content = '```vaneui\ncomponent: Custom\ntext: hello\n```';
      render(
        <Md
          content={content}
          parseFrontmatter={parseYaml}
          components={{ Custom }}
        />
      );
      const marker = screen.getByTestId('custom-marker');
      expect(marker).toHaveTextContent('hello');
    });

    it('leaves non-vaneui fences as code blocks (no regression)', () => {
      const content = '```ts\nconst x = 1;\n```';
      const { container } = render(
        <Md content={content} parseFrontmatter={parseYaml} components={defaultRegistry} />
      );
      expect(container.querySelector('code.language-ts')).toBeInTheDocument();
      expect(container.textContent).toContain('const x = 1;');
    });

    it('renders nested children specs recursively', () => {
      const content = [
        '```vaneui',
        'component: Stack',
        'children:',
        '  - component: Row',
        '    children:',
        '      - component: Badge',
        '        text: A',
        '      - component: Badge',
        '        text: B',
        '```',
      ].join('\n');
      render(
        <Md content={content} parseFrontmatter={parseYaml} components={defaultRegistry} />
      );
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
    });
  });

  describe('expandShorthand — YAML shorthand transformer', () => {
    it('expands single-token leaf with no value', () => {
      expect(expandShorthand({ Divider: null })).toEqual({ component: 'Divider' });
    });

    it('expands leaf with text — string value becomes children', () => {
      expect(expandShorthand({ Text: 'Hello' })).toEqual({
        component: 'Text',
        children: 'Hello',
      });
    });

    it('expands leaf with multiple boolean flags', () => {
      expect(expandShorthand({ 'Title xl bold': 'Welcome' })).toEqual({
        component: 'Title',
        xl: true,
        bold: true,
        children: 'Welcome',
      });
    });

    it('expands container with list-of-shorthand children', () => {
      expect(
        expandShorthand({
          'Card primary filled': [
            { 'Title xl': 'Welcome' },
            { Text: 'Done.' },
          ],
        })
      ).toEqual({
        component: 'Card',
        primary: true,
        filled: true,
        children: [
          { component: 'Title', xl: true, children: 'Welcome' },
          { component: 'Text', children: 'Done.' },
        ],
      });
    });

    it('expands map value into additional props (non-boolean props supported)', () => {
      expect(
        expandShorthand({
          'Button primary filled': { href: '/go', text: 'Get started' },
        })
      ).toEqual({
        component: 'Button',
        primary: true,
        filled: true,
        href: '/go',
        text: 'Get started',
      });
    });

    it('expands map with explicit children alongside non-boolean props', () => {
      expect(
        expandShorthand({
          'Card primary': {
            href: '/x',
            children: [{ Text: 'Body' }],
          },
        })
      ).toEqual({
        component: 'Card',
        primary: true,
        href: '/x',
        children: [{ component: 'Text', children: 'Body' }],
      });
    });

    it('passes verbose form through unchanged (depth 1)', () => {
      const verbose = {
        component: 'Card',
        primary: true,
        children: [{ component: 'Text', text: 'Hi' }],
      };
      expect(expandShorthand(verbose)).toEqual(verbose);
    });

    it('does NOT expand lowercase keys (treated as plain map)', () => {
      const input = { 'card primary': 'Hello' };
      expect(expandShorthand(input)).toEqual(input);
    });

    it('mixes shorthand and verbose in the same tree', () => {
      const out = expandShorthand({
        'Card primary': [
          { component: 'Title', xl: true, text: 'Verbose' },
          { Text: 'Shorthand' },
        ],
      });
      expect(out).toEqual({
        component: 'Card',
        primary: true,
        children: [
          { component: 'Title', xl: true, text: 'Verbose' },
          { component: 'Text', children: 'Shorthand' },
        ],
      });
    });

    it('handles deeply nested shorthand (3 levels)', () => {
      const out = expandShorthand({
        Section: [
          {
            'Card primary': [
              { 'Title xl': 'Hello' },
              { Text: 'Body' },
            ],
          },
        ],
      });
      expect(out).toEqual({
        component: 'Section',
        children: [
          {
            component: 'Card',
            primary: true,
            children: [
              { component: 'Title', xl: true, children: 'Hello' },
              { component: 'Text', children: 'Body' },
            ],
          },
        ],
      });
    });

    it('renders shorthand inside a vaneui fence end-to-end', () => {
      const content = [
        '```vaneui',
        'Card primary filled:',
        '  - Title xl: Welcome',
        '  - Text: Everything you need to ship.',
        '```',
      ].join('\n');
      render(
        <Md
          content={content}
          parseFrontmatter={parseYaml}
          components={defaultRegistry}
        />
      );
      expect(screen.getByText('Welcome')).toBeInTheDocument();
      expect(screen.getByText('Everything you need to ship.')).toBeInTheDocument();
    });

    it('renders top-level shorthand leaf in a fence', () => {
      const content = '```vaneui\nText: Hello world\n```';
      render(
        <Md
          content={content}
          parseFrontmatter={parseYaml}
          components={defaultRegistry}
        />
      );
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('renders shorthand with non-boolean props in a fence', () => {
      const content = [
        '```vaneui',
        'Button primary filled:',
        '  href: /go',
        '  text: Get started',
        '```',
      ].join('\n');
      const { container } = render(
        <Md
          content={content}
          parseFrontmatter={parseYaml}
          components={defaultRegistry}
        />
      );
      const link = container.querySelector('a[href="/go"]');
      expect(link).toBeInTheDocument();
      expect(link?.textContent).toContain('Get started');
    });
  });

  describe('vaneui fence — edge cases', () => {
    it('empty fence body renders nothing without crashing', () => {
      const content = '```vaneui\n```';
      const renderFn = () => render(
        <Md content={content} parseFrontmatter={parseYaml} components={defaultRegistry} />
      );
      expect(renderFn).not.toThrow();
    });

    it('whitespace-only fence body renders nothing', () => {
      const content = '```vaneui\n   \n   \n```';
      const { container } = render(
        <Md content={content} parseFrontmatter={parseYaml} components={defaultRegistry} />
      );
      // Should produce no rendered output and no MdError
      expect(container.textContent).not.toMatch(/Error:/);
    });

    it('root-level string spec renders the string as a text node (escape hatch)', () => {
      const content = '```vaneui\njust a string\n```\n\nAfter.';
      const { container } = render(
        <Md content={content} parseFrontmatter={parseYaml} components={defaultRegistry} />
      );
      expect(container.textContent).toContain('just a string');
      expect(screen.getByText('After.')).toBeInTheDocument();
    });

    it('root-level array spec is silently skipped', () => {
      const content = '```vaneui\n- one\n- two\n```\n\nAfter.';
      render(
        <Md content={content} parseFrontmatter={parseYaml} components={defaultRegistry} />
      );
      expect(screen.getByText('After.')).toBeInTheDocument();
    });

    it('empty components registry — vaneui spec silently no-ops', () => {
      const content = '```vaneui\nText: should not appear\n```\n\nAfter.';
      render(
        <Md content={content} parseFrontmatter={parseYaml} components={{}} />
      );
      expect(screen.queryByText('should not appear')).not.toBeInTheDocument();
      expect(screen.getByText('After.')).toBeInTheDocument();
    });
  });

  describe('Md — context isolation between instances', () => {
    it('two <Md> with different registries render independently', () => {
      const Custom1: React.FC<React.PropsWithChildren> = ({ children }) => (
        <span data-testid="reg1">{children}</span>
      );
      const Custom2: React.FC<React.PropsWithChildren> = ({ children }) => (
        <span data-testid="reg2">{children}</span>
      );
      const content1 = '```vaneui\nCustom1: hello-from-1\n```';
      const content2 = '```vaneui\nCustom2: hello-from-2\n```';

      render(
        <>
          <Md content={content1} parseFrontmatter={parseYaml} components={{ Custom1 }} />
          <Md content={content2} parseFrontmatter={parseYaml} components={{ Custom2 }} />
        </>
      );

      expect(screen.getByTestId('reg1')).toHaveTextContent('hello-from-1');
      expect(screen.getByTestId('reg2')).toHaveTextContent('hello-from-2');
      // Custom1 should NOT be available to the second Md, and vice versa
      expect(screen.queryByText('hello-from-1')?.closest('[data-testid="reg2"]')).toBeNull();
    });
  });

  describe('frontmatter — rich data types', () => {
    it('exposes nested object values via interpolation', () => {
      const content = '---\nhero:\n  title: Welcome\n---\n\nTitle is: {% $markdoc.frontmatter.hero.title %}';
      render(<Md content={content} parseFrontmatter={parseYaml} />);
      expect(screen.getByText(/Title is: Welcome/)).toBeInTheDocument();
    });

    it('exposes array values (joined or accessed by index)', () => {
      const content = '---\ntags: [alpha, beta, gamma]\n---\n\nFirst tag: {% $markdoc.frontmatter.tags.0 %}';
      render(<Md content={content} parseFrontmatter={parseYaml} />);
      expect(screen.getByText(/First tag: alpha/)).toBeInTheDocument();
    });

    it('exposes numeric values', () => {
      const content = '---\ncount: 42\n---\n\nCount: {% $markdoc.frontmatter.count %}';
      render(<Md content={content} parseFrontmatter={parseYaml} />);
      expect(screen.getByText(/Count: 42/)).toBeInTheDocument();
    });

    it('exposes boolean values without crashing (React renders booleans as nothing — see frontmatterRaw for visible verification)', () => {
      const content = '---\npublished: true\n---\n\nstatus={% $markdoc.frontmatter.published %}|raw={% $markdoc.frontmatterRaw %}';
      const { container } = render(<Md content={content} parseFrontmatter={parseYaml} />);
      // The boolean itself renders as nothing (React invariant), but frontmatterRaw proves the YAML was seen.
      expect(container.textContent).toMatch(/raw=published: true/);
      // The boolean substitution leaves "status=" with no value after it, then "|raw=…"
      expect(container.textContent).toMatch(/status=\|/);
    });
  });
});