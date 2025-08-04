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
    // Now using VaneUI Code component with secondary prop
    expect(code).toHaveClass('w-fit', 'h-fit', 'transition-all', 'duration-200');
    expect(code).toHaveClass('whitespace-nowrap', 'px-2', 'py-1', 'text-sm');
    expect(code).toHaveClass('bg-(--background-color-secondary)', 'text-(--text-color-secondary)');
    expect(code).toHaveClass('border-(--border-color-secondary)', 'rounded-md');
    expect(code).toHaveClass('font-mono'); // monospace font for code
  });
});