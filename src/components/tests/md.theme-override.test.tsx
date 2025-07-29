import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, type ThemeProps, type PartialTheme } from '@vaneui/ui';
import { Md } from '../md';

describe('Md Component - ThemeOverride Tests', () => {
  describe('with themeOverride function', () => {
    it('should override title themes with custom appearance and typography', () => {
      const content = '# Override Title\n## Override Subtitle';
      
      const themeOverride = (theme: ThemeProps): ThemeProps => {
        const newTheme = { ...theme };
        
        try {
          const customTitleThemes = {
            ...theme.title.themes,
            appearance: {
              ...theme.title.themes.appearance,
              text: {
                ...theme.title.themes.appearance.text,
                danger: {
                  base: 'text-red-700',
                  hover: 'text-red-800', 
                  active: 'text-red-900'
                },
                warning: {
                  base: 'text-orange-600',
                  hover: 'text-orange-700',
                  active: 'text-orange-800'
                }
              }
            },
            size: {
              ...theme.title.themes.size,
              text: {
                ...theme.title.themes.size.text,
                xxl: 'text-6xl',
                xxxl: 'text-7xl'
              }
            },
            typography: {
              ...theme.title.themes.typography,
              fontWeight: {
                ...theme.title.themes.typography.fontWeight,
                extrabold: 'font-extrabold tracking-tight',
                black: 'font-black tracking-tighter drop-shadow-sm'
              },
              fontFamily: {
                ...theme.title.themes.typography.fontFamily,
                display: 'font-serif'
              }
            }
          };

          const TitleComponentTheme = (theme.title as any).constructor;
          newTheme.title = new TitleComponentTheme(
            theme.title.tag,
            'border-l-4 border-red-500 pl-4 py-2',
            customTitleThemes,
            theme.title.defaults
          );
        } catch (error) {
          console.log('Constructor approach failed:', error);
        }

        return newTheme;
      };

      const { container } = render(
        <ThemeProvider themeOverride={themeOverride}>
          <Md content={content} />
        </ThemeProvider>
      );

      const h1 = container.querySelector('h1');
      const h2 = container.querySelector('h2');

      expect(h1).toHaveClass('border-l-4', 'border-red-500', 'pl-4', 'py-2');
      expect(h2).toHaveClass('border-l-4', 'border-red-500', 'pl-4', 'py-2');
    });

    it('should override link themes with custom appearance and size', () => {
      const content = '[Override Link](https://example.com) and [Another Link](https://test.com)';
      
      const themeOverride = (theme: ThemeProps): ThemeProps => {
        const newTheme = { ...theme };
        
        try {
          const customLinkThemes = {
            ...theme.link.themes,
            appearance: {
              ...theme.link.themes.appearance,
              text: {
                ...theme.link.themes.appearance.text,
                primary: {
                  base: 'text-blue-600',
                  hover: 'text-blue-700',
                  active: 'text-blue-800'
                },
                secondary: {
                  base: 'text-purple-600',
                  hover: 'text-purple-700', 
                  active: 'text-purple-800'
                }
              }
            },
            size: {
              ...theme.link.themes.size,
              text: {
                ...theme.link.themes.size.text,
                xl: 'text-xl',
                xxl: 'text-2xl'
              }
            },
            typography: {
              ...theme.link.themes.typography,
              fontWeight: {
                ...theme.link.themes.typography.fontWeight,
                bold: 'font-bold',
                extrabold: 'font-extrabold'
              },
              textDecoration: {
                ...theme.link.themes.typography.textDecoration,
                underline: 'underline decoration-2',
                'double-underline': 'underline decoration-double decoration-2'
              }
            }
          };

          const LinkComponentTheme = (theme.link as any).constructor;
          newTheme.link = new LinkComponentTheme(
            theme.link.tag,
            'transition-colors duration-200 hover:scale-105',
            customLinkThemes,
            theme.link.defaults
          );
        } catch (error) {
          console.log('Link theme override failed:', error);
        }

        return newTheme;
      };

      const { container } = render(
        <ThemeProvider themeOverride={themeOverride}>
          <Md content={content} />
        </ThemeProvider>
      );

      const links = container.querySelectorAll('a');
      expect(links).toHaveLength(2);

      links.forEach(link => {
        expect(link).toHaveClass('transition-colors', 'duration-200', 'hover:scale-105');
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href');
      });
    });

    it('should override list themes with appearance and size customization', () => {
      const content = '- Override Item 1\n- Override Item 2\n- Override Item 3';
      
      const themeOverride = (theme: ThemeProps): ThemeProps => {
        const newTheme = { ...theme };
        
        try {
          const customListThemes = {
            ...theme.list.themes,
            appearance: {
              ...theme.list.themes.appearance,
              text: {
                ...theme.list.themes.appearance.text,
                info: {
                  base: 'text-blue-700',
                  hover: 'text-blue-800',
                  active: 'text-blue-900'
                },
                success: {
                  base: 'text-green-700',
                  hover: 'text-green-800',
                  active: 'text-green-900'
                }
              }
            },
            size: {
              ...theme.list.themes.size,
              text: {
                ...theme.list.themes.size.text,
                lg: 'text-lg',
                xl: 'text-xl leading-relaxed'
              },
              paddingLeft: {
                ...theme.list.themes.size.paddingLeft,
                xl: 'pl-8',
                xxl: 'pl-12'
              }
            },
            typography: {
              ...theme.list.themes.typography,
              fontWeight: {
                ...theme.list.themes.typography.fontWeight,
                medium: 'font-medium',
                semibold: 'font-semibold'
              },
              fontFamily: {
                ...theme.list.themes.typography.fontFamily,
                mono: 'font-mono'
              }
            }
          };

          const ListComponentTheme = (theme.list as any).constructor;
          newTheme.list = new ListComponentTheme(
            theme.list.tag,
            'space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200',
            customListThemes,
            theme.list.defaults
          );
        } catch (error) {
          console.log('List theme override failed:', error);
        }

        return newTheme;
      };

      const { container } = render(
        <ThemeProvider themeOverride={themeOverride}>
          <Md content={content} />
        </ThemeProvider>
      );

      const list = container.querySelector('ul');
      
      expect(list).toHaveClass('space-y-3', 'bg-gray-50', 'p-4', 'rounded-lg', 'border', 'border-gray-200');
      expect(list).toBeInTheDocument();
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
        const newTheme = { ...theme };

        try {
          const titleThemes = {
            ...theme.title.themes,
            appearance: {
              ...theme.title.themes.appearance,
              text: {
                ...theme.title.themes.appearance.text,
                brand: {
                  base: 'text-indigo-800',
                  hover: 'text-indigo-900',
                  active: 'text-indigo-950'
                },
                accent: {
                  base: 'text-purple-700',
                  hover: 'text-purple-800',
                  active: 'text-purple-900'
                }
              }
            },
            size: {
              ...theme.title.themes.size,
              text: {
                ...theme.title.themes.size.text,
                hero: 'text-5xl',
                display: 'text-6xl'
              }
            },
            typography: {
              ...theme.title.themes.typography,
              fontWeight: {
                ...theme.title.themes.typography.fontWeight,
                black: 'font-black tracking-tight',
                extrabold: 'font-extrabold tracking-wide'
              },
              fontFamily: {
                ...theme.title.themes.typography.fontFamily,
                display: 'font-serif'
              }
            }
          };

          const linkThemes = {
            ...theme.link.themes,
            appearance: {
              ...theme.link.themes.appearance,
              text: {
                ...theme.link.themes.appearance.text,
                nav: {
                  base: 'text-indigo-600',
                  hover: 'text-indigo-800',
                  active: 'text-indigo-900'
                },
                brand: {
                  base: 'text-purple-600',
                  hover: 'text-purple-700',
                  active: 'text-purple-800'
                }
              }
            },
            size: {
              ...theme.link.themes.size,
              text: {
                ...theme.link.themes.size.text,
                nav: 'text-lg',
                hero: 'text-xl'
              }
            },
            typography: {
              ...theme.link.themes.typography,
              fontWeight: {
                ...theme.link.themes.typography.fontWeight,
                semibold: 'font-semibold',
                bold: 'font-bold'
              },
              textDecoration: {
                ...theme.link.themes.typography.textDecoration,
                'hover-underline': 'hover:underline',
                'always-underline': 'underline decoration-2'
              }
            }
          };

          const listThemes = {
            ...theme.list.themes,
            appearance: {
              ...theme.list.themes.appearance,
              text: {
                ...theme.list.themes.appearance.text,
                content: {
                  base: 'text-gray-800',
                  hover: 'text-gray-900',
                  active: 'text-gray-950'
                },
                muted: {
                  base: 'text-gray-600',
                  hover: 'text-gray-700',
                  active: 'text-gray-800'
                }
              }
            },
            size: {
              ...theme.list.themes.size,
              text: {
                ...theme.list.themes.size.text,
                content: 'text-lg leading-relaxed',
                compact: 'text-base leading-snug'
              },
              paddingLeft: {
                ...theme.list.themes.size.paddingLeft,
                content: 'pl-6',
                deep: 'pl-10'
              }
            },
            typography: {
              ...theme.list.themes.typography,
              fontWeight: {
                ...theme.list.themes.typography.fontWeight,
                medium: 'font-medium',
                semibold: 'font-semibold'
              }
            }
          };
          const TitleTheme = (theme.title as any).constructor;
          newTheme.title = new TitleTheme(
            theme.title.tag,
            'border-b-2 border-indigo-200 pb-3 mb-6',
            titleThemes,
            theme.title.defaults
          );

          const LinkTheme = (theme.link as any).constructor;
          newTheme.link = new LinkTheme(
            theme.link.tag,
            'px-2 py-1 rounded transition-all duration-200',
            linkThemes,
            theme.link.defaults
          );

          const ListTheme = (theme.list as any).constructor;
          newTheme.list = new ListTheme(
            theme.list.tag,
            'space-y-2 border border-gray-200 rounded-lg p-4 bg-white shadow-sm',
            listThemes,
            theme.list.defaults
          );

        } catch (error) {
          console.log('Theme ecosystem override failed:', error);
        }

        return newTheme;
      };

      const { container } = render(
        <ThemeProvider themeOverride={themeOverride}>
          <Md content={content} />
        </ThemeProvider>
      );

      const h1 = container.querySelector('h1');
      const link = container.querySelector('a');
      const list = container.querySelector('ul');

      expect(h1).toHaveClass('border-b-2', 'border-indigo-200', 'pb-3', 'mb-6');
      expect(link).toHaveClass('px-2', 'py-1', 'rounded', 'transition-all', 'duration-200');
      expect(list).toHaveClass('space-y-2', 'border', 'border-gray-200', 'rounded-lg', 'p-4', 'bg-white', 'shadow-sm');

      expect(h1).toBeInTheDocument();
      expect(link).toBeInTheDocument();
      expect(list).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('should handle themeOverride with rerender', () => {
      const content = '# Dynamic Override';
      
      let overrideMode = 'danger';
      const themeOverride = (theme: ThemeProps): ThemeProps => {
        const newTheme = { ...theme };
        newTheme.title.defaults = {
          ...theme.title.defaults,
          [overrideMode]: true,
          default: false,
        };
        return newTheme;
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