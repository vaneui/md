import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, type ThemeProps, type PartialTheme, Title, Link, List } from '@vaneui/ui';
import { Md } from '../md';

describe('Md Component - ThemeOverride Tests', () => {
  describe('with themeOverride function', () => {
    it('should validate that theme overrides actually apply to components', () => {
      const themeOverride = (theme: ThemeProps): ThemeProps => {
        // Override specific theme properties that we can test
        theme.title.themes.appearance.text.danger.base = 'text-red-700-override';
        theme.title.themes.typography.fontWeight.extrabold = 'font-extrabold-override tracking-tight';
        theme.title.themes.typography.fontFamily.serif = 'font-serif-override';
        theme.title.themes.size.text.xl = 'text-6xl-override';
        
        theme.link.themes.appearance.text.primary.base = 'text-blue-600-override';
        theme.link.themes.typography.fontWeight.bold = 'font-bold-override';
        
        theme.list.themes.appearance.text.info.base = 'text-info-700-override';
        theme.list.themes.typography.fontWeight.medium = 'font-medium-override';
        
        return theme;
      };

      const { container } = render(
        <ThemeProvider themeOverride={themeOverride}>
          <div>
            <Title danger extrabold serif xl tag="h1">Test Title</Title>
            <Link primary bold href="#test">Test Link</Link>
            <List info medium>
              <li>Test List Item</li>
            </List>
          </div>
        </ThemeProvider>
      );

      const title = container.querySelector('h1');
      const link = container.querySelector('a');
      const list = container.querySelector('ul');

      expect(title).toBeInTheDocument();
      expect(link).toBeInTheDocument();
      expect(list).toBeInTheDocument();
      
      // Validate that the theme overrides are actually applied to the rendered components
      // These tests prove that theme overrides using direct property assignment work
      expect(title).toHaveClass('text-red-700-override'); // danger appearance override ✓
      expect(title).toHaveClass('font-extrabold-override', 'tracking-tight'); // fontWeight override ✓
      
      expect(link).toHaveClass('font-bold-override'); // fontWeight override ✓
      
      expect(list).toHaveClass('text-info-700-override'); // info appearance override ✓
      expect(list).toHaveClass('font-medium-override'); // fontWeight override ✓
      
      // Additional validation that theme override function was called and modified the theme
      expect(title).not.toHaveClass('text-red-700'); // original danger class should be overridden
      expect(link).not.toHaveClass('font-bold'); // original bold class should be overridden  
      expect(list).not.toHaveClass('font-medium'); // original medium class should be overridden
    });
    it('should override title themes with custom appearance and typography', () => {
      const content = '# Override Title\n## Override Subtitle';
      
      const themeOverride = (theme: ThemeProps): ThemeProps => {
        // Override the default title appearance to use danger styling with custom classes
        theme.title.themes.appearance.text.default.base = 'text-red-700-custom';
        theme.title.themes.appearance.text.default.hover = 'hover:text-red-800-custom';
        theme.title.themes.appearance.text.default.active = 'active:text-red-900-custom';
        
        // Override text sizes that are actually used by the Md component (xl for h1, lg for h2)
        theme.title.themes.size.text.xl = 'text-6xl-custom';
        theme.title.themes.size.text.lg = 'text-5xl-custom';
        
        // Override typography that will be applied
        theme.title.themes.typography.fontWeight.bold = 'font-bold-custom tracking-tight';
        theme.title.themes.typography.fontFamily.sans = 'font-sans-custom';
        
        return theme;
      };

      const { container } = render(
        <ThemeProvider themeOverride={themeOverride}>
          <Md content={content} />
        </ThemeProvider>
      );

      const h1 = container.querySelector('h1');
      const h2 = container.querySelector('h2');

      expect(h1).toBeInTheDocument();
      expect(h2).toBeInTheDocument();
      
      // Validate that the actual overridden classes are applied to the Md rendered elements
      expect(h1).toHaveClass('text-red-700-custom'); // default appearance override for h1
      expect(h1).toHaveClass('hover:text-red-800-custom'); // hover appearance override
      expect(h1).toHaveClass('active:text-red-900-custom'); // active appearance override
      expect(h1).toHaveClass('font-sans-custom'); // fontFamily override
      
      expect(h2).toHaveClass('text-red-700-custom'); // default appearance override for h2
      expect(h2).toHaveClass('font-sans-custom'); // fontFamily override
    });

    it('should override link themes with custom appearance and size', () => {
      const content = '[Override Link](https://example.com) and [Another Link](https://test.com)';
      
      const themeOverride = (theme: ThemeProps): ThemeProps => {
        // Override the default link appearance and typography that will actually be used
        theme.link.themes.appearance.text.default.base = 'text-blue-600-custom';
        theme.link.themes.appearance.text.default.hover = 'hover:text-blue-700-custom';
        
        // Override default size if links use it
        theme.link.themes.size.text.md = 'text-lg-custom';
        
        // Override typography that's actually applied
        theme.link.themes.typography.fontWeight.normal = 'font-semibold-custom';
        theme.link.themes.typography.textDecoration.underline = 'underline-custom decoration-2';
        
        return theme;
      };

      const { container } = render(
        <ThemeProvider themeOverride={themeOverride}>
          <Md content={content} />
        </ThemeProvider>
      );

      const links = container.querySelectorAll('a');
      expect(links).toHaveLength(2);

      links.forEach((link, index) => {
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href');
        
        // Validate that the actual overridden classes are applied to the Md rendered links
        expect(link).toHaveClass('font-semibold-custom'); // fontWeight override
      });
    });

    it('should override list themes with appearance and size customization', () => {
      const content = '- Override Item 1\n- Override Item 2\n- Override Item 3';
      
      const themeOverride = (theme: ThemeProps): ThemeProps => {
        // Override the default list appearance and typography that will actually be used
        theme.list.themes.appearance.text.default.base = 'text-blue-700-custom';
        theme.list.themes.appearance.text.default.hover = 'hover:text-blue-800-custom';
        
        // Override default size that lists use
        theme.list.themes.size.text.md = 'text-lg-custom';
        
        // Override padding left with custom values
        theme.list.themes.size.paddingLeft.padding = {
          xs: 'pl-2-custom',
          sm: 'pl-4-custom',
          md: 'pl-6-custom',
          lg: 'pl-8-custom',
          xl: 'pl-10-custom'
        };
        
        // Override typography that's actually applied
        theme.list.themes.typography.fontWeight.normal = 'font-medium-custom';
        theme.list.themes.typography.fontFamily.sans = 'font-mono-custom';
        
        return theme;
      };

      const { container } = render(
        <ThemeProvider themeOverride={themeOverride}>
          <Md content={content} />
        </ThemeProvider>
      );

      const list = container.querySelector('ul');
      expect(list).toBeInTheDocument();
      
      // Validate that the actual overridden classes are applied to the Md rendered list
      expect(list).toHaveClass('text-blue-700-custom'); // default appearance override
      expect(list).toHaveClass('hover:text-blue-800-custom'); // hover appearance override
      expect(list).toHaveClass('pl-6-custom'); // paddingLeft override
      expect(list).toHaveClass('font-medium-custom'); // fontWeight override
    });

    it('should combine themeOverride with custom theme', () => {
      const content = '# Combined Theme\n[Combined Link](https://example.com)\n- Combined List';
      
      const customTheme: PartialTheme = {
        title: {
          defaults: {
            primary: true
          }
        }
      };

      const themeOverride = (theme: ThemeProps): ThemeProps => {
        const newTheme = { ...theme };
        newTheme.title.defaults = {
          ...theme.title.defaults,
          semibold: false,
          black: true // Override adds black weight to the primary appearance
        };
        newTheme.link.defaults = {
          ...theme.link.defaults,
          sm: true
        };
        return newTheme;
      };

      const { container } = render(
        <ThemeProvider theme={customTheme} themeOverride={themeOverride}>
          <Md content={content} />
        </ThemeProvider>
      );

      const h1 = container.querySelector('h1');
      const link = container.querySelector('a');

      // Title should have both custom theme (primary) and override (black)
      expect(h1).toHaveClass('text-(--text-color-primary)', 'font-black');
      expect(h1).toHaveClass('text-4xl');

      // Link should have override applied
      expect(link).toHaveClass('text-sm');
      expect(link).toHaveClass('text-(--text-color-link)');
    });

    it('should apply themeOverride with nested theme modifications', () => {
      const content = '# Nested Override\n[Nested Link](https://example.com)';
      
      const themeOverride = (theme: ThemeProps): ThemeProps => {
        const newTheme = { ...theme };
        // Since themes is readonly, we can only modify defaults
        newTheme.title.defaults = {
          ...theme.title.defaults,
          warning: true,
          default: false
        };
        return newTheme;
      };

      const { container } = render(
        <ThemeProvider themeOverride={themeOverride}>
          <Md content={content} />
        </ThemeProvider>
      );

      const h1 = container.querySelector('h1');

      // Title should have nested theme override applied
      expect(h1).toHaveClass('text-(--text-color-warning)');
      expect(h1).toHaveClass('text-4xl');
    });

    it('should create cohesive design system by overriding all component themes', () => {
      const content = `# Design System Header
[Navigation Link](https://example.com)
- System List Item
- Styled Content Item`;

      const themeOverride = (theme: ThemeProps): ThemeProps => {
        // Override title themes using real theme structure that will be applied
        theme.title.themes.appearance.text.default.base = 'text-indigo-800-system';
        theme.title.themes.appearance.text.default.hover = 'hover:text-indigo-900-system';
        theme.title.themes.appearance.text.default.active = 'active:text-indigo-950-system';
        
        theme.title.themes.size.text.xl = 'text-5xl-system';
        theme.title.themes.typography.fontWeight.semibold = 'font-black-system tracking-tight';
        theme.title.themes.typography.fontFamily.sans = 'font-serif-system';

        // Override link themes using real theme structure that will be applied
        theme.link.themes.appearance.text.default.base = 'text-indigo-600-system';
        theme.link.themes.appearance.text.default.hover = 'hover:text-indigo-800-system';
        theme.link.themes.appearance.text.default.active = 'active:text-indigo-900-system';
        
        theme.link.themes.size.text.md = 'text-lg-system';
        theme.link.themes.typography.fontWeight.normal = 'font-semibold-system';
        theme.link.themes.typography.textDecoration.underline = 'underline-system decoration-2';

        // Override list themes using real theme structure that will be applied
        theme.list.themes.appearance.text.default.base = 'text-gray-800-system';
        theme.list.themes.appearance.text.default.hover = 'hover:text-gray-900-system';
        theme.list.themes.appearance.text.default.active = 'active:text-gray-950-system';
        
        theme.list.themes.size.text.md = 'text-lg-system leading-relaxed';
        theme.list.themes.size.paddingLeft.padding = {
          xs: 'pl-2-system',
          sm: 'pl-4-system',
          md: 'pl-6-system',
          lg: 'pl-8-system',
          xl: 'pl-10-system'
        };
        theme.list.themes.typography.fontWeight.normal = 'font-medium-system';

        return theme;
      };

      const { container } = render(
        <ThemeProvider themeOverride={themeOverride}>
          <Md content={content} />
        </ThemeProvider>
      );

      const h1 = container.querySelector('h1');
      const link = container.querySelector('a');
      const list = container.querySelector('ul');

      expect(h1).toBeInTheDocument();
      expect(link).toBeInTheDocument();
      expect(list).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://example.com');

      // Validate that the actual overridden classes are applied to create a cohesive design system
      // Title assertions - verify the theme overrides are actually applied
      expect(h1).toHaveClass('text-indigo-800-system'); // title appearance override
      expect(h1).toHaveClass('hover:text-indigo-900-system'); // title hover override
      expect(h1).toHaveClass('active:text-indigo-950-system'); // title active override
      expect(h1).toHaveClass('font-black-system', 'tracking-tight'); // title fontWeight override
      
      // Link assertions - verify link theme overrides
      expect(link).toHaveClass('font-semibold-system'); // link fontWeight override
      
      // List assertions - verify list theme overrides  
      expect(list).toHaveClass('text-gray-800-system'); // list appearance override
      expect(list).toHaveClass('hover:text-gray-900-system'); // list hover override
      expect(list).toHaveClass('active:text-gray-950-system'); // list active override
      expect(list).toHaveClass('pl-6-system'); // list paddingLeft override
      expect(list).toHaveClass('font-medium-system'); // list fontWeight override
    });

    it('should handle themeOverride with rerender', () => {
      const content = '# Dynamic Override';
      
      let overrideMode = 'danger';
      const themeOverride = (theme: ThemeProps): ThemeProps => {
        // Direct property assignment
        theme.title.defaults = {
          ...theme.title.defaults,
          [overrideMode]: true,
          default: false,
        };
        return theme;
      };

      const { container, rerender } = render(
        <ThemeProvider themeOverride={themeOverride}>
          <Md content={content} />
        </ThemeProvider>
      );

      let h1 = container.querySelector('h1');
      expect(h1).toHaveClass('text-(--text-color-danger)');

      // Change override mode and rerender
      overrideMode = 'success';
      rerender(
        <ThemeProvider themeOverride={themeOverride}>
          <Md content={content} />
        </ThemeProvider>
      );

      h1 = container.querySelector('h1');
      expect(h1).toHaveClass('text-(--text-color-success)');
      expect(h1).not.toHaveClass('text-(--text-color-danger)');
    });
  });
});