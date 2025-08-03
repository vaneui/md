import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdLink Component', () => {
  test('renders link with href and content', () => {
    const content = '[Link text](https://example.com)';
    render(<Md content={content} />);
    const link = screen.getByRole('link', { name: 'Link text' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com');
    // VaneUI Link component classes
    expect(link).toHaveClass('hover:underline', 'w-fit');
    expect(link).toHaveClass('cursor-pointer'); // link behavior
    expect(link).toHaveClass('font-sans', 'font-normal');
  });

  test('renders link with title attribute', () => {
    const content = '[Link text](https://example.com "Link title")';
    render(<Md content={content} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('title', 'Link title');
    expect(link).toHaveTextContent('Link text');
  });

  test('renders multiple links in content', () => {
    const content = 'Visit [Google](https://google.com) or [GitHub](https://github.com)';
    render(<Md content={content} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', 'https://google.com');
    expect(links[1]).toHaveAttribute('href', 'https://github.com');
  });
});