import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdHeading Component', () => {
  test('renders h1 with level 1', () => {
    const content = '# Heading 1';
    const { container } = render(<Md content={content} />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Heading 1');
    expect(heading.tagName).toBe('H1');
    // VaneUI Title component classes for xl size with CSS variables
    expect(heading).toHaveClass('text-(length:--fs-desktop)'); // CSS variable font size
    expect(heading).toHaveClass('text-balance', 'w-fit');
    expect(heading).toHaveClass('font-sans', 'font-semibold');
  });

  test('renders h3 with level 3', () => {
    const content = '### Heading 3';
    render(<Md content={content} />);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Heading 3');
    expect(heading.tagName).toBe('H3');
    // VaneUI Title component classes for md size with CSS variables
    expect(heading).toHaveClass('text-(length:--fs-desktop)'); // CSS variable font size
    expect(heading).toHaveClass('text-balance', 'w-fit');
    expect(heading).toHaveClass('font-sans', 'font-semibold');
  });

  test('renders h6 with level 6', () => {
    const content = '###### Heading 6';
    render(<Md content={content} />);
    const heading = screen.getByRole('heading', { level: 6 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Heading 6');
    expect(heading.tagName).toBe('H6');
    // VaneUI Title component classes for xs size with CSS variables
    expect(heading).toHaveClass('text-(length:--fs-desktop)'); // CSS variable font size
    expect(heading).toHaveClass('text-balance', 'w-fit');
    expect(heading).toHaveClass('font-sans', 'font-semibold');
  });

  test('renders all heading levels correctly', () => {
    const content = `# H1 Title
## H2 Title  
### H3 Title
#### H4 Title
##### H5 Title
###### H6 Title`;
    render(<Md content={content} />);
    
    const h1 = screen.getByRole('heading', { level: 1 });
    const h2 = screen.getByRole('heading', { level: 2 });
    const h3 = screen.getByRole('heading', { level: 3 });
    const h4 = screen.getByRole('heading', { level: 4 });
    const h5 = screen.getByRole('heading', { level: 5 });
    const h6 = screen.getByRole('heading', { level: 6 });
    
    expect(h1).toHaveTextContent('H1 Title');
    expect(h2).toHaveTextContent('H2 Title');
    expect(h3).toHaveTextContent('H3 Title');
    expect(h4).toHaveTextContent('H4 Title');
    expect(h5).toHaveTextContent('H5 Title');
    expect(h6).toHaveTextContent('H6 Title');
    
    // Verify CSS variable size classes for each heading level

    // All should have common Title classes with CSS variables
    [h1, h2, h3, h4, h5, h6].forEach(heading => {
      expect(heading).toHaveClass('text-(length:--fs-desktop)'); // CSS variable font size
      expect(heading).toHaveClass('text-balance', 'w-fit');
      expect(heading).toHaveClass('font-sans', 'font-semibold');
    });
  });
});