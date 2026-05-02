import { defaultRegistry } from '../registry';

describe('defaultRegistry', () => {
  it('includes safe presentational components', () => {
    const expectedSafe = [
      'Card', 'CardHeader', 'CardBody', 'CardFooter',
      'Title', 'PageTitle', 'SectionTitle', 'Text',
      'Section', 'Container',
      'Row', 'Col', 'Stack',
      'Grid2', 'Grid3', 'Grid4', 'Grid5', 'Grid6',
      'Button', 'Badge', 'Chip', 'Code', 'Kbd', 'Mark',
      'Link', 'NavLink',
      'List', 'ListItem',
      'Divider', 'Img', 'Icon', 'Label',
      'Blockquote',
    ];
    for (const name of expectedSafe) {
      expect(defaultRegistry[name]).toBeDefined();
    }
  });

  it('excludes components requiring callbacks (open/onClose/onChange/onClick)', () => {
    const expectedExcluded = [
      'Modal', 'ModalHeader', 'ModalBody', 'ModalFooter', 'ModalCloseButton',
      'Overlay',
      'Popup', 'PopupTrigger',
      'Menu', 'MenuItem', 'MenuLabel',
      'Input', 'Checkbox',
      'IconButton',
    ];
    for (const name of expectedExcluded) {
      expect(defaultRegistry[name]).toBeUndefined();
    }
  });

  it('exposes each entry as a renderable component (function or object)', () => {
    for (const [name, value] of Object.entries(defaultRegistry)) {
      expect(value).toBeDefined();
      // Components are either functions (FC) or objects (forwardRef/memo)
      const t = typeof value;
      expect(t === 'function' || t === 'object').toBe(true);
      expect(name).toMatch(/^[A-Z]/);
    }
  });
});
