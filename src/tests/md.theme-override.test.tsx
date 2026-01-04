import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, type ThemeProps, type PartialTheme, Title, Link, List } from '@vaneui/ui';
import { Md } from '../components/md';

describe('Md Component - ThemeOverride Tests', () => {
  describe('with themeOverride function', () => {
    it('should validate that theme overrides actually apply to components', () => {
      const themeOverride = (theme: ThemeProps): ThemeProps => {
        // Override SimpleConsumerTheme base class
        theme.title.themes.appearance.text.base = 'text-red-700-override';
        theme.title.themes.typography.fontWeight.extrabold = 'font-extrabold-override tracking-tight';
        theme.title.themes.typography.fontFamily.serif = 'font-serif-override';

        theme.link.themes.typography.fontWeight.bold = 'font-bold-override';

        theme.list.themes.appearance.text.base = 'text-info-700-override';
        theme.list.themes.typography.fontWeight.medium = 'font-medium-override';

        return theme;
      };

      const { container } = render(
        <ThemeProvider themeOverride={themeOverride}>
          <div>
            <Title danger extrabold serif xl tag="h1">Test Title</Title>
            <Link bold href="#test">Test Link</Link>
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

      // Title should have overridden text class
      expect(title).toHaveClass('text-red-700-override');
      expect(title).toHaveClass('font-extrabold-override', 'tracking-tight');

      expect(link).toHaveClass('font-bold-override');

      // List should have overridden text class
      expect(list).toHaveClass('text-info-700-override');
      expect(list).toHaveClass('font-medium-override');

      expect(title).not.toHaveClass('text-red-700');
      expect(link).not.toHaveClass('font-bold');
      expect(list).not.toHaveClass('font-medium');
    });

    it('should combine themeOverride with custom theme', () => {
      const content = '# Combined Theme';

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
          black: true
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

      expect(h1).toHaveClass('text-(--text-color)', 'font-black');
      expect(h1).toHaveClass('[--fs-unit:var(--fs-unit-desktop)]');
      expect(h1).toHaveClass('text-(length:--fs)');
    });

    it('should apply themeOverride with nested theme modifications', () => {
      const content = '# Nested Override';

      const themeOverride = (theme: ThemeProps): ThemeProps => {
        const newTheme = { ...theme };
        newTheme.title.defaults = {
          ...theme.title.defaults,
          warning: true,
          primary: false
        };
        return newTheme;
      };

      const { container } = render(
        <ThemeProvider themeOverride={themeOverride}>
          <Md content={content} />
        </ThemeProvider>
      );

      const h1 = container.querySelector('h1');

      expect(h1).toHaveClass('text-(--text-color)');
      expect(h1).toHaveAttribute('data-appearance', 'warning');
      expect(h1).toHaveClass('[--fs-unit:var(--fs-unit-desktop)]');
      expect(h1).toHaveClass('text-(length:--fs)');
    });

    it('should handle themeOverride with rerender', () => {
      const content = '# Dynamic Override';

      let overrideMode = 'danger';
      const themeOverride = (theme: ThemeProps): ThemeProps => {
        theme.title.defaults = {
          ...theme.title.defaults,
          [overrideMode]: true,
          primary: false,
        };
        return theme;
      };

      const { container, rerender } = render(
        <ThemeProvider themeOverride={themeOverride}>
          <Md content={content} />
        </ThemeProvider>
      );

      let h1 = container.querySelector('h1');
      expect(h1).toHaveClass('text-(--text-color)');
      expect(h1).toHaveAttribute('data-appearance', 'danger');

      overrideMode = 'success';
      rerender(
        <ThemeProvider themeOverride={themeOverride}>
          <Md content={content} />
        </ThemeProvider>
      );

      h1 = container.querySelector('h1');
      expect(h1).toHaveClass('text-(--text-color)');
      expect(h1).toHaveAttribute('data-appearance', 'success');
    });
  });
});
