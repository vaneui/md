import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, type PartialTheme } from '@vaneui/ui';
import { Md } from '../components/md';

describe('Md Component - Theme Structure Tests', () => {
  describe('with nested themes customization', () => {
    it('should apply custom appearance themes to titles', () => {
      const content = '# Info Title\n## Warning Subtitle';
      const customTheme: PartialTheme = {
        title: {
          themes: {
            appearance: {
              text: {
                default: {
                  base: 'text-blue-600'
                }
              }
            }
          },
          defaults: {
            underline: true
          }
        }
      };

      const { container } = render(
        <ThemeProvider theme={customTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      const h1 = container.querySelector('h1');
      const h2 = container.querySelector('h2');

      // Both should inherit the custom info appearance
      expect(h1).toHaveClass('underline', 'text-blue-600');
      expect(h2).toHaveClass('underline', 'text-blue-600');
      
      // But maintain their respective size overrides from MdHeading
      expect(h1).toHaveClass('text-4xl'); // xl size maintained
      expect(h2).toHaveClass('text-3xl'); // lg size maintained
    });

    it('should apply custom size themes to links', () => {
      const content = '[Large Link](https://example.com) and [Another Link](https://test.com)';
      const customTheme: PartialTheme = {
        link: {
          themes: {
            size: {
              text: {
                lg: 'text-xl'
              }
            }
          },
          defaults: {
            bold: true,
            lg: true,
          }
        }
      };

      const { container } = render(
        <ThemeProvider theme={customTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      const links = container.querySelectorAll('a');
      expect(links).toHaveLength(2);

      links.forEach(link => {
        expect(link).toHaveClass('text-xl', 'font-bold');
        expect(link).toHaveClass('text-(--text-color-link)'); // Link color maintained
      });
    });

    it('should apply custom typography themes to lists', () => {
      const content = '- Serif Item 1\n- Serif Item 2\n- Serif Item 3';
      const customTheme: PartialTheme = {
        list: {
          themes: {
            typography: {
              fontFamily: {
                serif: 'font-serif italic'
              }
            }
          },
          defaults: {
            serif: true
          }
        }
      };

      const { container } = render(
        <ThemeProvider theme={customTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      const list = container.querySelector('ul');
      expect(list).toHaveClass('font-serif', 'italic');
      expect(list).toHaveClass('list-disc', 'list-inside'); // Base classes maintained
    });

    it('should handle multiple nested theme customizations', () => {
      const content = `# Complex Title
[Complex Link](https://example.com)
- Complex List Item`;

      const complexTheme: PartialTheme = {
        title: {
          themes: {
            appearance: {
              text: {
                accent: {
                  base: 'text-purple-600 drop-shadow-lg'
                }
              }
            },
            typography: {
              fontWeight: {
                black: 'font-black tracking-tighter'
              }
            }
          },
          defaults: {
            accent: true,
            black: true
          }
        },
        link: {
          themes: {
            typography: {
              textDecoration: {
                underline: 'underline decoration-2 decoration-blue-500'
              }
            }
          },
          defaults: {
            underline: true
          }
        },
        list: {
          themes: {
            appearance: {
              text: {
                success: {
                  base: 'text-green-600'
                }
              }
            }
          },
          defaults: {
            success: true
          }
        }
      };

      const { container } = render(
        <ThemeProvider theme={complexTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      const h1 = container.querySelector('h1');
      const link = container.querySelector('a');
      const list = container.querySelector('ul');

      // Title with multiple theme customizations
      expect(h1).toHaveClass('text-purple-600', 'drop-shadow-lg', 'font-black', 'tracking-tighter');
      expect(h1).toHaveClass('text-4xl'); // Size override maintained

      // Link with custom text decoration
      expect(link).toHaveClass('underline', 'decoration-2', 'decoration-blue-500');
      expect(link).toHaveClass('text-(--text-color-link)'); // Color maintained

      // List with custom appearance
      expect(list).toHaveClass('text-green-600', 'font-normal');
    });

    it('should handle partial nested theme overrides', () => {
      const content = '# Partial Custom\n[Standard Link](https://example.com)';
      const partialTheme: PartialTheme = {
        title: {
          themes: {
            typography: {
              fontWeight: {
                light: 'font-light opacity-75'
              }
            }
          },
          defaults: {
            light: true
          }
        }
        // Link uses default theme completely
      };

      const { container } = render(
        <ThemeProvider theme={partialTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      const h1 = container.querySelector('h1');
      const link = container.querySelector('a');

      // Title should have custom weight theme
      expect(h1).toHaveClass('font-light', 'opacity-75');
      expect(h1).toHaveClass('text-(--text-color-default)'); // Default appearance maintained

      // Link should maintain all default properties
      expect(link).toHaveClass('hover:underline', 'w-fit', 'cursor-pointer', 'text-(--text-color-link)', 'font-sans', 'font-normal');
    });
  });

  describe('theme inheritance and cascading', () => {
    it('should properly cascade nested theme customizations', () => {
      const content = `# Cascaded Title
- Cascaded List Item`;

      const cascadedTheme: PartialTheme = {
        title: {
          themes: {
            appearance: {
              text: {
                secondary: {
                  base: 'text-gray-600'
                },
                primary: {
                  base: 'text-blue-600 font-bold'
                }
              }
            }
          },
          defaults: {
            secondary: true
          }
        },
        list: {
          themes: {
            appearance: {
              text: {
                primary: {
                  base: 'text-blue-500 list-disc'
                }
              }
            }
          },
          defaults: {
            primary: true
          }
        }
      };

      const { container } = render(
        <ThemeProvider theme={cascadedTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      const h1 = container.querySelector('h1');
      const list = container.querySelector('ul');

      // Title uses secondary appearance theme
      expect(h1).toHaveClass('text-gray-600');
      expect(h1).not.toHaveClass('text-blue-600', 'font-bold');

      // List uses primary appearance theme
      expect(list).toHaveClass('text-blue-500', 'list-disc');
    });
  });
});