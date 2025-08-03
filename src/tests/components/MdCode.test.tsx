import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdCode Component', () => {
  test('renders code element with content and CSS class', () => {
    const content = 'This has `code snippet` inline.';
    render(<Md content={content} />);
    const code = screen.getByText('code snippet');
    expect(code).toBeInTheDocument();
    // Now using Badge component instead of CODE element
    // VaneUI Badge component classes for inline code
    expect(code).toHaveClass('px-4', 'py-2', 'rounded-full');
    expect(code).toHaveClass('text-base'); // default badge size
    expect(code).toHaveClass('font-sans', 'font-semibold');
    expect(code).toHaveClass('inline-flex', 'items-center');
    expect(code).toHaveClass('whitespace-nowrap');
  });
});